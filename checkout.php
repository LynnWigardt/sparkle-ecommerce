<?php

session_start();

require_once "api/db.php";


if (!isset($_SESSION["cart"])) {
    $_SESSION["cart"] = [];
}

$cart_items = array_count_values($_SESSION["cart"]);

$total = 0;

$order_completed = false;

foreach ($cart_items as $product_id => $quantity) {

    $sql = "SELECT * FROM products WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([":id" => $product_id]);
    $product = $stmt->fetch();

    $item_total = $product["price"] * $quantity;

    $total += $item_total;
}



if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $first_name = $_POST["first_name"];
    $last_name = $_POST["last_name"];
    $email = $_POST["email"];

    $sql = "INSERT INTO customers (first_name, last_name, email)
            VALUES (:first_name, :last_name, :email)";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ":first_name" => $first_name,
        ":last_name" => $last_name,
        ":email" => $email
    ]);


    $customer_id = $pdo->lastInsertId();


    $sql = "INSERT INTO orders (customer_id, order_date, total_price)
            VALUES (:customer_id, NOW(), :total_price)";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ":customer_id" => $customer_id,
        ":total_price" => $total
    ]);

    $order_id = $pdo->lastInsertId();

foreach ($cart_items as $product_id => $quantity) {
    $sql = "INSERT INTO orderitems (order_id, product_id, quantity)
            VALUES (:order_id, :product_id, :quantity)";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ":order_id" => $order_id,
        ":product_id" => $product_id,
        ":quantity" => $quantity
    ]);
}

$order_completed = true;

}


?>

<?php if (!$order_completed): ?>

<form method="POST" action="checkout.php">

    <h2>Kunduppgifter</h2>

    <label for="first_name">Förnamn:</label>
    <input type="text" id="first_name" name="first_name" required>

    <label for="last_name">Efternamn:</label>
    <input type="text" id="last_name" name="last_name" required>

    <label for="email">E-mail:</label>
    <input type="email" id="email" name="email" required>

    <button type="submit">Slutför köp</button>

</form>

<?php endif; ?>

<?php if ($order_completed): ?>

    <h2>Tack för din beställning <?= $first_name ?> <?= $last_name ?>!</h2>

    <p>Din order har registrerats på <?= $email ?>.</p>

<?php endif; ?>

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

    <h2>Din beställning</h2>

    <?php foreach ($cart_items as $product_id => $quantity): ?>

   <?php
    $sql = "SELECT * FROM products WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([":id" => $product_id]);
    $product = $stmt->fetch();

    $item_total = $product["price"] * $quantity;
    ?>

    <h3><?= $product["name"] ?></h3>
    <p>Antal: <?= $quantity ?></p>
    <p>Pris: <?= $product["price"] ?> kr</p>
    <p>Summa: <?= $item_total ?> kr</p>


<?php endforeach; ?>

<h2>Totalt: <?= $total ?> kr</h2>

<a href="cart.php">Tillbaka till varukorgen</a>

</body>
</html>