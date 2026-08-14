<?php

session_start();

require_once "api/db.php";

if (!isset($_SESSION["cart"])) {
    $_SESSION["cart"] = [];
}

$cart_items = array_count_values($_SESSION["cart"]);

$total = 0;


foreach ($cart_items as $product_id => $quantity) {

    $sql = "SELECT * FROM products WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([":id" => $product_id]);

    $product = $stmt->fetch();

    echo "<h3>" . $product["name"] . "</h3>";
    echo "<p>Antal: " . $quantity . "</p>";
    echo "<p>Pris: " . $product["price"] . " kr</p>";

    $item_total = $product["price"] * $quantity;

    echo "<p>Summa: " . $item_total . " kr</p>";

    $total += $item_total;
}

echo "<h2>Totalt: " . $total . " kr</h2>";

?>

<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/style.css">
    <title>Kassa - Sparkle</title>
</head>

<body>

<h1>Kassa</h1>

<h2> Din beställning</h2>

<p>Produkter i din varukorg:</p>.

<a href="cart.php">Tillbaka till varukorgen</a>

</body>
</html>