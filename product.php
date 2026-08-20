<?php

require_once "api/db.php";

$product_id = $_GET["id"];

$sql = "SELECT * FROM products WHERE id = :id";

$stmt = $pdo->prepare($sql);

$stmt->execute([
    ":id" => $product_id
]);

$product = $stmt->fetch();

echo "<h1>" . $product["name"] . "</h1>";
echo "<img class='product-detail-image' src='" . $product["image"] . "' alt='" . $product["name"] . "'>";
echo "<p>Pris: " . $product["price"] . " kr</p>";
echo "<p>" . $product["description"] . "</p>";


?>
<link rel="stylesheet" href="css/style.css">