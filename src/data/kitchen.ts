export type KitchenEntry = {
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  category: string;
  tags: string[];
};

export const kitchen: KitchenEntry[] = [
  {
    title: 'Sourdough discard pizza crust',
    ingredients: [
      '1 cup (227g) sourdough starter, unfed/discard',
      '1/2 cup plus 2 tablespoons to 3/4 cup (141g to 170g) water, lukewarm',
      '2 1/2 cups (300g) King Arthur Unbleached All-Purpose Flour',
      '1 teaspoon table salt',
      '1/2 teaspoon instant yeast or active dry yeast',
    ],
    instructions: [
      'Stir any liquid on top of your refrigerated starter back into it before measuring 1 cup (227g) into a large mixing bowl.',
      'Combine the lesser amount of water, the flour, salt, and yeast with the sourdough starter.',
      'Mix to combine, adding the remaining water 1 tablespoon at a time if the dough looks dry. Knead for about 7 minutes using a stand mixer with its dough hook, until the dough cleans the sides of the bowl.',
      'Place the dough in a lightly greased container, cover, and let rise until almost doubled in bulk (2-4 hours depending on starter vitality).',
      'Preheat oven to 475F. Place oiled cast iron in the oven to heat up with it.',
      'Roll out the dough at least 2 inches wider than the pan. Give it a 15-minute rest if it starts to snap back.',
      'When the oven is heated, remove the cast iron. Carefully place the dough inside and position it. Add sauce and toppings.',
      'Bake for 10-15 minutes until crust is golden and toppings are cooked through.',
    ],
    category: 'Pizza',
    tags: ['sourdough', 'discard', 'pizza', 'cast iron', 'yeast'],
  },
];
