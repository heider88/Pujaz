db = db.getSiblingDB('pujaz_catalogo');

// Índice de texto para búsquedas eficientes
db.items.createIndex({ titulo: "text", descripcion: "text", categoria: "text" });

// 10 artículos semilla con la relación lógica subastaId definida en la arquitectura
db.items.insertMany([
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60001"), titulo: "Reloj Vintage", categoria: "antigüedades", descripcion: "Reloj de bolsillo de 1920.", subastaId: 1 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60002"), titulo: "Pintura Abstracta", categoria: "arte", descripcion: "Óleo sobre lienzo original.", subastaId: 2 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60003"), titulo: "Moneda Romana", categoria: "coleccionables", descripcion: "Moneda de plata del imperio romano.", subastaId: 3 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60004"), titulo: "Ford Mustang 1969", categoria: "vehículos", descripcion: "Restaurado con piezas originales.", subastaId: 4 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60005"), titulo: "Collar de Perlas", categoria: "joyas", descripcion: "Perlas cultivadas con cierre de oro.", subastaId: 5 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60006"), titulo: "Cámara Leica", categoria: "coleccionables", descripcion: "Cámara fotográfica clásica de 35mm.", subastaId: 6 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60007"), titulo: "Escultura de Bronce", categoria: "arte", descripcion: "Escultura contemporánea firmada.", subastaId: 7 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60008"), titulo: "Anillo de Diamante", categoria: "joyas", descripcion: "Diamante corte brillante de 1 quilate.", subastaId: 8 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60009"), titulo: "Edición Primera Don Quijote", categoria: "antigüedades", descripcion: "Ejemplar en buen estado de conservación.", subastaId: 9 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60010"), titulo: "Porsche 911 Clásico", categoria: "vehículos", descripcion: "Motor original, pintura impecable.", subastaId: 10 }
]);
