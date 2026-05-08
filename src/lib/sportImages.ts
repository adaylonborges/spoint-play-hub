import beachTennis from "@/assets/sports/beach-tennis.jpg";
import tenis from "@/assets/sports/tenis.jpg";
import futebol from "@/assets/sports/futebol.jpg";
import futsal from "@/assets/sports/futsal.jpg";
import basquete from "@/assets/sports/basquete.jpg";
import volei from "@/assets/sports/volei.jpg";
import corrida from "@/assets/sports/corrida.jpg";
import ciclismo from "@/assets/sports/ciclismo.jpg";
import generic from "@/assets/sports/generic.jpg";

const map: Record<string, string> = {
  "Beach Tennis": beachTennis,
  "Tênis": tenis,
  "Futebol": futebol,
  "Futsal": futsal,
  "Basquete": basquete,
  "Vôlei": volei,
  "Corrida": corrida,
  "Ciclismo": ciclismo,
};

export function getSportImage(sport?: string | null): string {
  if (!sport) return generic;
  return map[sport] ?? generic;
}
