<?php
// Compatible with PHP 7.1+. Uses the hosting mail service; bot credentials are not read.
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
$text = "Заявка с сайта\nИмя: " . $name . "\nТелефон: " . $phone;
$labels = ['rooms'=>'Комнаты', 'budget'=>'Бюджет', 'initial_deposit'=>'Первоначальный взнос, ₽', 'district'=>'Район', 'financing'=>'Способ покупки', 'timing'=>'Переезд', 'wishes'=>'Пожелания'];
foreach ($labels as $key=>$label) { $value = field($data, $key, $key === 'wishes' ? 2000 : 500); $text .= "\n" . $label . ': ' . ($value === '' ? 'Не указано' : $value); }
// The recipient and sender are fixed server-side, never supplied by the visitor.
$recipient = 'cherrry207@rambler.ru';
$sender = 'no-reply@novostroyki-tyumen72.ru';
$subject = '=?UTF-8?B?' . base64_encode('Новая заявка на подбор квартиры') . '?=';
$headers = "From: " . $sender . "\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: base64\r\n";
if (!function_exists('mail')) respond(503, ['ok'=>false, 'message'=>'Почтовая отправка на хостинге недоступна. Свяжитесь с Александрой по ссылкам в шапке.']);
$accepted = @mail($recipient, $subject, chunk_split(base64_encode($text)), $headers);
if (!$accepted) respond(502, ['ok'=>false, 'message'=>'Хостинг не принял письмо к отправке. Попробуйте позже или свяжитесь с Александрой по ссылкам в шапке.']);
// mail() confirms acceptance by the local mail service, not delivery to the inbox.
respond(200, ['ok'=>true, 'message'=>'Заявка принята и передана почтовой службе. Спасибо за обращение!']);
