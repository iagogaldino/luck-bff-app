const express = require("express");
const port = process.env.PORT || 3000;
const app = express();
app.listen(port, () => {
    console.log(`Servidor está rodando na porta ${port}`);
  });


  app.get("/", (req, res) => {
    console.log('Rxeqaaa')
    res.json({ message: "Estou online" });
  });