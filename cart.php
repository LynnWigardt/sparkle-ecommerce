<?php

session_start();

// $_SESSION["cart"] = [];  För att rensa varukorgen

require_once "api/db.php";

if (!isset($_SESSION["cart"])) {
    $_SESSION["cart"] = [];
}

if (isset($_POST["remove_id"])) {
    $remove_id = $_POST["remove_id"];

    $_SESSION["cart"] = array_filter(
        $_SESSION["cart"],
        function ($id) use ($remove_id) {
            return $id != $remove_id;
        }
    );
}

if (isset($_POST["product_id"])) {
    $product_id = $_POST["product_id"];

    $_SESSION["cart"][] = $product_id;
}

$_SESSION["cart"] = array_filter(
    $_SESSION["cart"],
    function ($id) {
        return is_int($id) || ctype_digit((string) $id);
    }
);

$cart_items = array_count_values($_SESSION["cart"]);

$total = 0;

foreach ($cart_items as $product_id => $quantity) {

$sql = "SELECT * FROM products WHERE id = :id";
$stmt = $pdo->prepare($sql);
$stmt->execute([":id" => $product_id]);

$product = $stmt->fetch();

echo "<div class='cart-product'>";

echo "<img src='images/" . $product["image"] . "' width='150'>";

echo "<h2>" . $product["name"] . "</h2>";

echo "<p>" . $product["price"] . " kr</p>";

echo "<p>Antal: " . $quantity . "</p>";

$item_total = $product["price"] * $quantity;

echo "<p>Summa: " . $item_total . " kr</p>";

echo "<form method='POST' action='cart.php'>";
echo "<input type='hidden' name='remove_id' value='" . $product_id . "'>";
echo "<button type='submit'>Ta bort</button>";
echo "</form>";

$total += $item_total;

echo "</div>";

}

echo "<h2>Totalt: " . $total . " kr</h2>";

?>

<a href="index.php">Fortsätt handla</a>