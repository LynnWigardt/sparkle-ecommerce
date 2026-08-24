<?php

session_start();

require_once "api/db.php";

$sql = "SELECT * FROM products";
$stmt = $pdo->prepare($sql);
$stmt->execute();
$products = $stmt->fetchAll();

?>

<!DOCTYPE html>
<html lang="sv">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="css/style.css">
        <title>Sparkle</title>

        <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap" rel="stylesheet">
    </head>

<body>

<header class="site-header">
    <div class="logo">Sparkle</div>

    <nav>
        <a href="index.php">Hem</a>
        <a href="#collection">Kollektion</a>
        <a href="#">Om oss</a>
        <a href="#">Kontakt</a>
    </nav>

    <a href="cart.php" class="cart-link">🛒 Varukorg</a>
</header>

<section class="hero">
    <h1>Sparkle</h1>
    <p>TIMELESS ELEGANCE</p>
</section>

<div class="products" id="collection">

<div class="products">

<?php foreach ($products as $product): ?>

    <div class="product">

    <a href="product.php?id=<?= $product["id"] ?>" class="product-link">
    <h2><?= $product["name"] ?></h2>
    <p><?= $product["price"] ?> kr</p>
    <p><?= $product["description"] ?></p>
    <img src="<?= $product["image"] ?>" alt="<?= $product["name"] ?>" width="200">
    </a>

    <form method="POST" action="cart.php">
        <input type="hidden" name="product_id" value="<?= $product["id"] ?>">
        <button type="submit">Lägg i varukorg</button>
    </form>

    </div>

    <?php endforeach; ?>

</div>

</body>
</html>