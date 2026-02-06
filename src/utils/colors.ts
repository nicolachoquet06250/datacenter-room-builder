/**
 * Calcule la luminosité d'une couleur hexadécimale et retourne une couleur de contraste (noir ou blanc).
 * @param hexColor La couleur au format hexadécimal (ex: #FFFFFF ou #FFF)
 * @returns 'white' ou 'black'
 */
export const getContrastColor = (hexColor: string): 'white' | 'black' => {
  if (!hexColor) return 'white';

  // Supprimer le # si présent
  const hex = hexColor.replace('#', '');

  // Convertir en RGB
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex.substring(0, 1).repeat(2), 16);
    g = parseInt(hex.substring(1, 2).repeat(2), 16);
    b = parseInt(hex.substring(2, 3).repeat(2), 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }

  // Calculer la luminance (formule standard)
  // https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-procedure
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? 'black' : 'white';
};
