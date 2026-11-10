<?php
// Compatible with PHP 7.1+. Keep credentials outside public_html.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function respond($status, $body) { http_response_code($status); echo json_encode($body, JSON_UNESCAPED_UNICODE); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['ok'=>false, 'message'=>'Используйте форму сайта.']);
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 16000) respond(413, ['ok'=>false, 'message'=>'Слишком большой запрос.']);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]) respond(403, ['ok'=>false, 'message'=>'Отправьте заявку с сайта.']);
if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) respond(415, ['ok'=>false, 'message'=>'Неверный формат заявки.']);
$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data) || ($data['personal_data_consent'] ?? '') !== 'accepted') respond(422, ['ok'=>false, 'message'=>'Необходимо согласие на обработку данных.']);
function field($data, $key, $max) {
    $value = $data[$key] ?? '';
    if (!is_string($value) || strlen($value) > $max) respond(422, ['ok'=>false, 'message'=>'Проверьте поля формы.']);
    return trim(str_replace(["\r", "\n"], ' ', $value));
}
$name = field($data, 'client_name', 320); $phone = field($data, 'client_phone', 100);
$digits = preg_replace('/\D/', '', $phone);
if ($name === '' || !preg_match('/^[+0-9()\s-]+$/', $phone) || strlen($digits) < 10 || strlen($digits) > 15) respond(422, ['ok'=>false, 'message'=>'Укажите имя и корректный телефон.']);
$channel = field($data, 'delivery_channel', 16);
if (!in_array($channel, ['telegram', 'max'], true)) respond(422, ['ok'=>false, 'message'=>'Выберите Telegram или MAX.']);
$configPath = dirname(__DIR__, 2) . '/sedenkova-leads.php';
if (!is_file($configPath)) respond(503, ['ok'=>false, 'message'=>'Автоматическая отправка пока не подключена. Свяжитесь с Александрой по ссылкам в шапке сайта.']);
$config = require $configPath;
$destination = is_array($config) ? ($config[$channel] ?? []) : [];
$token = $destination['token'] ?? ''; $chatId = $destination['chat_id'] ?? '';
if (!$token || !$chatId || !function_exists('curl_init')) respond(503, ['ok'=>false, 'message'=>'Отправка в выбранный мессенджер пока не подключена.']);
$text = "Заявка с сайта\nИмя: " . $name . "\nТелефон: " . $phone;
$labels = ['rooms'=>'Комнаты', 'budget'=>'Бюджет', 'initial_deposit'=>'Первоначальный взнос, ₽', 'district'=>'Район', 'financing'=>'Способ покупки', 'timing'=>'Переезд', 'wishes'=>'Пожелания'];
foreach ($labels as $key=>$label) { $value = field($data, $key, $key === 'wishes' ? 2000 : 500); $text .= "\n" . $label . ': ' . ($value === '' ? 'Не указано' : $value); }
$url = $channel === 'telegram' ? 'https://api.telegram.org/bot' . $token . '/sendMessage' : 'https://platform-api.max.ru/messages?chat_id=' . rawurlencode((string)$chatId);
$payload = ['text'=>$text]; if ($channel === 'telegram') $payload['chat_id'] = $chatId;
$headers = ['Content-Type: application/json']; if ($channel === 'max') $headers[] = 'Authorization: ' . $token;
$curl = curl_init($url);
curl_setopt_array($curl, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode($payload, JSON_UNESCAPED_UNICODE), CURLOPT_HTTPHEADER=>$headers, CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>5, CURLOPT_TIMEOUT=>15]);
$result = curl_exec($curl); $status = curl_getinfo($curl, CURLINFO_HTTP_CODE); curl_close($curl);
$reply = is_string($result) ? json_decode($result, true) : null;
$delivered = $status >= 200 && $status < 300 && is_array($reply) && ($channel === 'telegram' ? !empty($reply['ok']) : !empty($reply['message']['body']['mid']));
if (!$delivered) respond(502, ['ok'=>false, 'message'=>'Не удалось подтвердить отправку. Попробуйте позже или свяжитесь с Александрой по ссылкам в шапке.']);
respond(200, ['ok'=>true]);
