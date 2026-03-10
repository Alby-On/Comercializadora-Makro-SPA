// faq.js
document.addEventListener('DOMContentLoaded', () => {
    const questions = document.querySelectorAll('.faq-question');

    questions.forEach(question => {
        question.addEventListener('click', () => {
            const item = question.parentElement;

            // Opcional: Cerrar las otras preguntas al abrir una nueva
            document.querySelectorAll('.faq-item').forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });

            // Alternar la clase active en la pregunta clickeada
            item.classList.toggle('active');
        });
    });
});
