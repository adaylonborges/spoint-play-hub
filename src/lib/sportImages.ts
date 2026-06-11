import beachTennis from "@/assets/sports/beach-tennis.jpg";
import tenis from "@/assets/sports/tenis.jpg";
import futebol from "@/assets/sports/futebol.jpg";
import futsal from "@/assets/sports/futsal.jpg";
import basquete from "@/assets/sports/basquete.jpg";
import volei from "@/assets/sports/volei.jpg";
import corrida from "@/assets/sports/corrida.jpg";
import ciclismo from "@/assets/sports/ciclismo.jpg";
import generic from "@/assets/sports/generic.jpg";

// Novas imagens esportivas premium em alta resolução
import futevolei from "@/assets/sports/futevolei.png";
import padel from "@/assets/sports/padel.png";
import artesMarciais from "@/assets/sports/artes_marciais.png";
import natacao from "@/assets/sports/natacao.png";
import funcional from "@/assets/sports/funcional.png";
import yoga from "@/assets/sports/yoga.png";
import skate from "@/assets/sports/skate.png";
import surf from "@/assets/sports/surf.png";
import escalada from "@/assets/sports/escalada.png";
import boxe from "@/assets/sports/boxe.png";

const map: Record<string, string> = {
  "Beach Tennis": beachTennis,
  "Tênis": tenis,
  "Futebol": futebol,
  "Futsal": futsal,
  "Basquete": basquete,
  "Vôlei de Quadra": volei,
  "Vôlei de Praia": futevolei,
  "Futevôlei": futevolei,
  "Padel": padel,
  "Tênis de Mesa": tenis,
  "Handebol": volei,
  "Artes Marciais / Jiu-Jitsu": artesMarciais,
  "Futebol Americano": futebol,
  "Golfe": generic,
  "Corrida": corrida,
  "Ciclismo": ciclismo,
  "Natação": natacao,
  "Funcional": funcional,
  "Crossfit": funcional,
  "Musculação": funcional,
  "Yoga": yoga,
  "Pilates": yoga,
  "Skate": skate,
  "Surf": surf,
  "Escalada": escalada,
  "Boxe": boxe,
};

export function getSportImage(sport?: string | null): string {
  if (!sport) return generic;
  return map[sport] ?? generic;
}

