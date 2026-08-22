<?php

$host = "fdb1028.awardspace.net";
$dbname = "4784327_sparkle";
$username = "4784327_sparkle";
$password = "891110lynn";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password
    );

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

} catch (PDOException $e) {
    die("Databasanslutningen misslyckades: " . $e->getMessage());
}