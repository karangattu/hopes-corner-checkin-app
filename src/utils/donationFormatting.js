export const formatProteinAndCarbsClipboardText = (consolidatedActivity = []) => {
  const types = ["Protein", "Carbs"];
  const grouped = {};
  for (const t of types) grouped[t] = [];

  for (const item of consolidatedActivity || []) {
    if (types.includes(item.type)) {
      grouped[item.type].push(item);
    }
  }

  // Sort by servings desc then item name
  for (const t of types) {
    grouped[t].sort((a, b) => (b.servings || 0) - (a.servings || 0) || a.itemName.localeCompare(b.itemName));
  }

  const lines = [];
  lines.push("Donations\n");
  for (const t of types) {
    lines.push(t);
    if (grouped[t].length === 0) {
      lines.push("None");
    } else {
      for (const entry of grouped[t]) {
        const trays = Number(entry.trays || 0);
        const servings = Number(entry.servings || 0);
        const traysText = `${trays} ${trays === 1 ? "tray" : "trays"}`;
        const servingsText = `${servings} ${servings === 1 ? "serving" : "servings"}`;
        lines.push(`${entry.itemName}: ${traysText}, ${servingsText}`);
      }
    }
    lines.push("\n");
  }
  return lines.join("\n");
};
