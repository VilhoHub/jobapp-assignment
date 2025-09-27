<?php
// public/api/rates.php
declare(strict_types=1);

// hand off to the real endpoint; it handles headers, CORS, validation, and exits.
require __DIR__ . '/../../src/api/rates.php';
