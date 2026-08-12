<?php

session_start();

require_once "api/db.php";

if (!isset($_SESSION["cart"])) {
    $_SESSION["cart"] = [];
}

$product_id = $_POST["product_id"];

$sql = "SELECT * FROM products WHERE id = :id";
$stmt = $pdo->prepare($sql);
$stmt->execute([":id" => $product_id]);

$_SESSION["cart"][] = $product_id;

echo "<pre>";
print_r($_SESSION["cart"]);
echo "</pre>";
?>

<a href="index.php">Fortsätt handla</a>