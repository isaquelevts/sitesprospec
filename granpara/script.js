const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.nav-links');

menuButton.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

navigation.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  });
});

const reviewsGrid = document.querySelector('.reviews-grid');
const reviewsMore = document.querySelector('.reviews-more');

if (reviewsMore && reviewsGrid) {
  reviewsMore.addEventListener('click', () => {
    const expanded = reviewsGrid.classList.toggle('show-all');
    reviewsMore.setAttribute('aria-expanded', String(expanded));
    reviewsMore.innerHTML = expanded ? 'Mostrar menos <span>−</span>' : 'Ver mais avaliações <span>＋</span>';
  });
}
