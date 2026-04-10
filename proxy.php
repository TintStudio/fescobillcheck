<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$refno = preg_replace('/[^0-9]/', '', $_GET['refno'] ?? '');

if (strlen($refno) !== 14) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid reference number"]);
    exit;
}

$url = "https://bill.pitc.com.pk/fescobill/general?refno=" . $refno;

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Accept: application/json",
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $httpcode !== 200) {
    http_response_code(502);
    echo json_encode(["error" => "Could not fetch bill from FESCO"]);
    exit;
}

echo $response;
