<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

$config = require_once __DIR__ . '/../config/config.php';

header('Access-Control-Allow-Origin: ' . $config['cors']['allow_origin']);
header('Access-Control-Allow-Methods: ' . $config['cors']['allow_methods']);
header('Access-Control-Allow-Headers: ' . $config['cors']['allow_headers']);
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') respond(['ok' => true], 204);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  respond(['error' => 'method_not_allowed', 'message' => 'Use POST /api/rates'], 405);
}

$raw = file_get_contents('php://input');
$in = json_decode($raw ?: '[]', true);
if (!is_array($in)) respond(['error' => 'bad_json', 'message' => 'Body must be JSON'], 400);

$unitName  = trim((string)($in['Unit Name'] ?? ''));
$arrivalIn = trim((string)($in['Arrival'] ?? ''));
$departIn  = trim((string)($in['Departure'] ?? ''));
$occupants = (int)($in['Occupants'] ?? 0);
$ages      = $in['Ages'] ?? null;

// validate input data
if ($unitName === '') {
  respond(['error'=>'unit_name_required','message'=>'Please select a unit'], 422);
}

$arrivalIso = toIso($arrivalIn);
$departIso  = toIso($departIn);
if (!$arrivalIso || !$departIso) {
  respond(['error'=>'bad_date_format','message'=>'Please enter valid arrival and departure dates'], 422);
}
if (strtotime($arrivalIso) >= strtotime($departIso)) {
  respond(['error'=>'date_order','message'=>'Departure date must be after arrival date'], 422);
}

if (!is_array($ages)) {
  respond(['error'=>'ages_required','message'=>'Please add at least one guest'], 422);
}
foreach ($ages as $a) {
  if (!is_int($a) && !(is_string($a) && ctype_digit($a))) {
    respond(['error'=>'ages_not_int','message'=>'Please enter valid ages for all guests'], 422);
  }
}
if ($occupants <= 0 || count($ages) !== $occupants) {
  respond([
    'error'=>'occupants_mismatch',
    'message'=>'Please ensure all guests have valid ages entered'
  ], 422);
}

// map unit name to api id
$map = require_once __DIR__ . '/../config/units.php';
if (!array_key_exists($unitName, $map)) {
  respond([
    'error' => 'unknown_unit_name',
    'message' => 'Use one of: ' . implode(', ', array_keys($map))
  ], 400);
}
$unitTypeId = (int)$map[$unitName];

// format payload for external api
$remotePayload = [
  'Unit Type ID' => $unitTypeId,
  'Arrival'      => $arrivalIso,
  'Departure'    => $departIso,
  'Guests'       => agesToGuests($ages, $config['app']['adult_age_threshold']),
];

// call external booking api
$remoteUrl = $config['remote_api']['url'];
[$status, $body] = postJson($remoteUrl, $remotePayload, $config['remote_api']['timeout']);

if ($status !== 200) {
  $userMessage = 'Sorry, we\'re having trouble getting rates right now. Please try again in a moment.';
  if ($status === 0) {
    $userMessage = 'Unable to connect to the booking system. Please check your internet connection and try again.';
  } elseif ($status >= 500) {
    $userMessage = 'The booking system is temporarily unavailable. Please try again later.';
  } elseif ($status === 404) {
    $userMessage = 'Booking service not found. Please contact support if this continues.';
  }
  
  respond([
    'error'   => 'upstream_failed',
    'message' => $userMessage,
    'technical_details' => [
      'status' => $status,
      'response' => substr($body, 0, 200) // Limit response size for security
    ]
  ], 502);
}

$remote = json_decode($body, true);
if ($remote === null) {
  respond([
    'unitName'  => $unitName,
    'arrival'   => $arrivalIso,
    'departure' => $departIso,
    'request'   => $remotePayload,
    'remoteRaw' => $body
  ]);
}

respond([
  'unitName'  => $unitName,
  'arrival'   => $arrivalIso,
  'departure' => $departIso,
  'request'   => $remotePayload,
  'remote'    => $remote
]);
