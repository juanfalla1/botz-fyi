import assert from "node:assert";
import { answerColombiaChef } from "../index";

function run(): void {
  const chaquetas = answerColombiaChef("quiero chaquetas talla m");
  assert(chaquetas.toLowerCase().includes("url:"), "Debe responder productos de chaquetas con URL");

  const promos = answerColombiaChef("que promos tienes");
  assert(promos.length > 20, "Debe responder algo para promos");

  const delantales = answerColombiaChef("busco delantales baratos");
  assert(delantales.toLowerCase().includes("delantal") || delantales.toLowerCase().includes("peto"), "Debe responder delantales");

  const cambios = answerColombiaChef("cual es la politica de cambios");
  assert(cambios.toLowerCase().includes("politicas oficiales"), "Debe responder politica de cambios");

  const sinPrecio = answerColombiaChef("blusa neru azafran");
  assert(
    sinPrecio.includes("No veo precio visible para ese producto en este momento."),
    "Si no hay precio visible, debe usar frase exacta"
  );

  const ohaus = answerColombiaChef("quiero cotizar ohaus");
  assert(ohaus.toLowerCase().includes("no corresponde a colombia chef"), "Debe rechazar temas de OHAUS");

  console.log("Colombia Chef basic tests passed");
}

run();
