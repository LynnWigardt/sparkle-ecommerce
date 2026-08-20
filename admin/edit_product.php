<?php

require_once "../api/db.php";

$product_id = $_GET["id"];

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $name = $_POST["name"];
    $price = $_POST["price"];
    $stock = $_POST["stock"];

    $sql = "UPDATE products
            SET name = :name, price = :price, stock = :stock
            WHERE id = :id";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ":name" => $name,
        ":price" => $price,
        ":stock" => $stock,
        ":id" => $product_id
    ]);

    echo "Produkten uppdaterades.";
}


$sql = "SELECT * FROM products WHERE id = :id";

$stmt = $pdo->prepare($sql);

$stmt->execute([
    ":id" => $product_id
]);

$product = $stmt->fetch();

?>

<h1>Redigera produkt</h1>

<form method="POST">

    <label for="name">Produktnamn:</label><br>
    <input type="text" id="name" name="name" value="<?php echo $product["name"]; ?>">
    <br><br>

    <label for="price">Pris:</label><br>
    <input type="number" id="price" name="price" step="0.01" value="<?php echo $product["price"]; ?>">
    <br><br>

    <label for="stock">Lagersaldo:</label><br>
    <input type="number" id="stock" name="stock" value="<?php echo $product["stock"]; ?>">
    <br><br>

    <button type="submit">Spara ändringar</button>

</form>