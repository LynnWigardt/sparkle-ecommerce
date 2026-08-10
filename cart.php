<?php
session_start();

if (!isset($_SESSION["cart"])) {
    $_SESSION["cart"] = [];
}

$product_id = $_POST["product_id"];

$_SESSION["cart"][] = $product_id;

echo "Produkten lades i varukorgen."; 