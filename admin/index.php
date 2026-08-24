<?php

require_once "../api/db.php";
require_once "config.php";


$sql = "SELECT 
    orders.id,
    orders.customer_id,
    orders.order_date,
    orders.total_price,
    customers.first_name,
    customers.last_name,
    customers.email,
    products.name AS product_name,
    orderitems.quantity
    FROM orders
    JOIN customers ON orders.customer_id = customers.id
    JOIN orderitems ON orders.id = orderitems.order_id
    JOIN products ON orderitems.product_id = products.id";

$stmt = $pdo->prepare($sql);
$stmt->execute();

$orders = $stmt->fetchAll();



$last_order_id = null;

foreach ($orders as $order) {

    if ($order["id"] != $last_order_id) {

    echo "<h2>Order #" . $order["id"] . "</h2>";
    echo "<p>Datum: " . $order["order_date"] . "</p>";
    echo "<p>Kund: " . $order["first_name"] . " " . $order["last_name"] . "</p>";
    echo "<p>E-mail: " . $order["email"] . "</p>";
    echo "<p>Totalsumma: " . $order["total_price"] . " kr</p>";
    
    echo "<h3>Produkter:</h3>";
    $last_order_id = $order["id"];
    }

    echo "<p>" . $order["product_name"] . " - " . $order["quantity"] . " st</p>";
}


if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $category_id = $_POST["category_id"];
    $name = $_POST["name"];
    $price = $_POST["price"];
    $stock = $_POST["stock"];
    $description = $_POST["description"];
    $image = $_FILES["image"];

if ($image["error"] !== UPLOAD_ERR_OK) {
    die("Det gick inte att ladda upp bilden.");
}

    $file_extension = pathinfo($image["name"], PATHINFO_EXTENSION);
    $file_name = uniqid() . "." . strtolower($file_extension);
    $tmp_name = $image["tmp_name"];

    $storage_url = $supabase_url . "/storage/v1/object/" . $bucket . "/" . $file_name;

    $ch = curl_init($storage_url);

curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents($tmp_name));

curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer " . $supabase_key,
    "apikey: " . $supabase_key,
    "Content-Type: " . $image["type"]
]);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

if ($http_code < 200 || $http_code >= 300) {
    die("Supabase svarade med HTTP " . $http_code . ": " . $response);
}

    $sql = "INSERT INTO products (category_id, name, description, price, stock, image)
    VALUES (:category_id, :name, :description, :price, :stock, :image)";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ":category_id" => $category_id,
        ":name" => $name,
        ":description" => $description,
        ":price" => $price,
        ":stock" => $stock,
        ":image" => $storage_url
    ]);

    echo "Produkten sparades.";
}
?>



<?php

$sql = "SELECT id, name, price FROM products";
$stmt = $pdo->prepare($sql);
$stmt->execute();

$products = $stmt->fetchAll();

?>

<h2>Produkter</h2>

<?php foreach ($products as $product): ?>

    <p>
    <?php echo $product["name"]; ?>
    - <?php echo $product["price"]; ?> kr

    <a href="edit_product.php?id=<?php echo $product["id"]; ?>">
        Redigera
    </a>
</p>


<?php endforeach; ?>



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

   <form method="POST" enctype="multipart/form-data">
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
        <input type="file" id="image" name="image">
        <br><br>

        <button type="submit">Spara produkt</button>
    </form>

</body>
</html>