<?php
// environment config for api
return [
    'remote_api' => [
        'url' => 'https://dev.gondwana-collection.com/Web-Store/Rates/Rates.php',
        'timeout' => 10,
    ],
    
    'app' => [
        'debug' => false,
        'adult_age_threshold' => 12,
    ],
    
    'cors' => [
        'allow_origin' => '*',
        'allow_methods' => 'POST, OPTIONS',
        'allow_headers' => 'Content-Type',
    ],
    
];
