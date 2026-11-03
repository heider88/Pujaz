db = db.getSiblingDB('pujaz_catalogo');

db.articulos.createIndex({ name: "text", description: "text", category: "text" });

// Las fotos las sirve Pz_web_fe desde public/lotes/ (ver Pz_web_fe/public/lotes/CREDITOS.md).
db.articulos.insertMany([
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60001"), name: "Reloj Vintage", category: "antigüedades", description: "Reloj de bolsillo de 1920.", images: ["/lotes/reloj-vintage.jpg"], documents: [], basePrice: 100000.00 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60002"), name: "Pintura Abstracta", category: "arte", description: "Óleo sobre lienzo original.", images: ["/lotes/pintura-abstracta.jpg"], documents: [], basePrice: 250000.00 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60003"), name: "Moneda Romana", category: "coleccionables", description: "Moneda de plata del imperio romano.", images: ["/lotes/moneda-romana.jpg"], documents: [], basePrice: 50000.00 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60004"), name: "Ford Mustang 1969", category: "vehículos", description: "Restaurado con piezas originales.", images: ["/lotes/ford-mustang-1969.jpg"], documents: [], basePrice: 800000.00 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60005"), name: "Collar de Perlas", category: "joyas", description: "Perlas cultivadas con cierre de oro.", images: ["/lotes/collar-perlas.jpg"], documents: [], basePrice: 120000.00 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60006"), name: "Cámara Leica", category: "coleccionables", description: "Cámara fotográfica clásica de 35mm.", images: ["/lotes/camara-leica.jpg"], documents: [], basePrice: 300000.00 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60007"), name: "Escultura de Bronce", category: "arte", description: "Escultura contemporánea firmada.", images: ["/lotes/escultura-bronce.jpg"], documents: [], basePrice: 450000.00 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60008"), name: "Anillo de Diamante", category: "joyas", description: "Diamante corte brillante de 1 quilate.", images: ["/lotes/anillo-diamante.jpg"], documents: [], basePrice: 900000.00 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60009"), name: "Edición Primera Don Quijote", category: "antigüedades", description: "Ejemplar en buen estado de conservación.", images: ["/lotes/don-quijote.jpg"], documents: [], basePrice: 60000.00 },
  { _id: ObjectId("60d5ec49f1b2c3d4e5f60010"), name: "Porsche 911 Clásico", category: "vehículos", description: "Motor original, pintura impecable.", images: ["/lotes/porsche-911.jpg"], documents: [], basePrice: 1000000.00 }
]);
