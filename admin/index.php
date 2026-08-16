<?php

require_once "../api/db.php";


$sql = "SELECT 
    orders.id,
    orders.customer_id,
    orders.order_date,
    orders.total_price,
    customers.first_name,
    customers.last_name,
    customers.email
    FROM orders
    JOIN customers ON orders.customer_id = customers.id";

$stmt = $pdo->prepare($sql);
$stmt->execute();

$orders = $stmt->fetchAll();

echo "<pre>";
print_r($orders);
echo "</pre>";

foreach ($orders as $order) {

    echo "<h2>Order #" . $order["id"] . "</h2>";
    echo "<p>Datum: " . $order["order_date"] . "</p>";
    echo "<p>Kund: " . $order["first_name"] . " " . $order["last_name"] . "</p>";
    echo "<p>E-mail: " . $order["email"] . "</p>";
    echo "<p>Totalsumma: " . $order["total_price"] . " kr</p>";

}



if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $category_id = $_POST["category_id"];
    $name = $_POST["name"];
    $price = $_POST["price"];
    $stock = $_POST["stock"];
    $description = $_POST["description"];
    $image = $_POST["image"];

    $sql = "INSERT INTO products (category_id, name, description, price, stock, image)
    VALUES (:category_id, :name, :description, :price, :stock, :image)";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ":category_id" => $category_id,
        ":name" => $name,
        ":description" => $description,
        ":price" => $price,
        ":stock" => $stock,
        ":image" => $image
    ]);

    echo "Produkten sparades.";
}
?>

<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sparkle Admin</title>
</head>
<body>

    <h1>Sparkle Admin</h1>


    <h2>Lägg till produkt</h2>

    <form method="POST">
        <label for="category_id">Kategori:</label><br>

        <select id="category_id" name="category_id">
            <option value="1">Ringar</option>
            <option value="2">Halsband</option>
            <option value="3">Armband</option>
            <option value="4">Örhänge</option>
        </select>

        <br><br>


        <label for="name">Produktnamn:</label><br>
        <input type="text" id="name" name="name">
        <br><br>

        <label for="price">Pris:</label><br>
        <input type="number" id="price" name="price" step="0.01">
        <br><br>

        <label for="stock">Lagersaldo:</label><br>
        <input type="number" id="stock" name="stock">
        <br><br>

        <label for="description">Beskrivning:</label><br>
        <textarea id="description" name="description" rows="4" cols="40"></textarea>
        <br><br>

        <label for="image">Bild:</label><br>
        <input type="text" id="image" name="image">
        <br><br>

        <button type="submit">Spara produkt</button>
    </form>

</body>
</html>