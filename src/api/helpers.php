<?php
declare(strict_types=1);

// json response helper
function respond(array $data, int $status = 200): never {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

// convert frontend date format to api format
function toIso(string $ddmmyyyy): ?string {
  $parts = explode('/', $ddmmyyyy);
  if (count($parts) !== 3) return null;
  [$dd, $mm, $yyyy] = $parts;
  if (!ctype_digit($dd) || !ctype_digit($mm) || !ctype_digit($yyyy)) return null;
  $d = (int)$dd; $m = (int)$mm; $y = (int)$yyyy;
  if (!checkdate($m, $d, $y)) return null;
  return sprintf('%04d-%02d-%02d', $y, $m, $d);
}

// convert ages to adult/child categories for api
function agesToGuests(array $ages, int $adultThreshold = 12): array {
  $out = [];
  foreach ($ages as $a) {
    $age = (int)$a;
    $out[] = ['Age Group' => ($age >= $adultThreshold ? 'Adult' : 'Child')];
  }
  return $out;
}

// http client for external api calls
function postJson(string $url, array $payload, int $timeoutSec = 10): array {
  $ch = curl_init($url);
  $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $json,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_TIMEOUT => $timeoutSec,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
  ]);
  $body = curl_exec($ch);
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 0;
  $err = curl_error($ch);
  curl_close($ch);
  if ($body === false) return [0, $err ?: 'cURL error'];
  return [$status, $body];
}
