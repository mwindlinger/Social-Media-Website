<?php
// This sample uses the Apache HTTP client from HTTP Components (http://hc.apache.org/httpcomponents-client-ga/)
header("Content-Type: application/json");
$picurl = $_POST['url'];
//$send = new alpha;
//$send->what = $al;
//echo json_encode($send);
//class alpha {
//    public $what = 'something';
//}
$insertwhat = '{"url":"'.$picurl.'"}';
require_once 'HTTP/Request2.php';

$request = new Http_Request2('https://api.projectoxford.ai/emotion/v1.0/recognize');
$url = $request->getUrl();

$headers = array(
    // Request headers
    'Content-Type' => 'application/json',
    'Ocp-Apim-Subscription-Key' => '3a18a9465ded493d8646373bf83ee409',   //API KEY HERE 
);

$request->setHeader($headers);

$parameters = array(
    // Request parameters
);

$url->setQueryVariables($parameters);

$request->setMethod(HTTP_Request2::METHOD_POST);

// Request body
$request->setBody($insertwhat);

try
{
    $response = $request->send();
    echo $response->getBody();
}
catch (HttpException $ex)
{
    echo $ex;
}

?>