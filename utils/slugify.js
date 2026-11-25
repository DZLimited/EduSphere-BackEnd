// "Complete React Course!" -> "complete-react-course"
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Returns a slug that no other document of `Model` is using.
// Appends -2, -3, ... on collision. `excludeId` lets a document keep/compare
// against its own current slug when it is being renamed.
const uniqueSlug = async (Model, text, excludeId = null) => {
  const base = slugify(text) || 'item';
  let candidate = base;
  let n = 2;

  const taken = (slug) =>
    Model.exists(excludeId ? { slug, _id: { $ne: excludeId } } : { slug });

  while (await taken(candidate)) {
    candidate = `${base}-${n++}`;
  }
  return candidate;
};

module.exports = { slugify, uniqueSlug };
