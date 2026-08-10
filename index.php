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
</head>

<body>

<h1>Sparkle</h1>

<div class="products">

<?php foreach ($products as $product): ?>

    <div class="product">

    <h2><?= $product["name"] ?></h2>
    <p><?= $product["price"] ?> kr</p>
    <p><?= $product["description"] ?></p>
    <img src="images/<?= $product["image"] ?>" alt="<?= $product["name"] ?>" width="200">

    <form method="POST" action="cart.php">
        <input type="hidden" name="product_id" value="<?= $product["id"] ?>">
        <button type="submit">Lägg i varukorg</button>
    </form>

    </div>

    <?php endforeach; ?>

</div>

</body>
</html>