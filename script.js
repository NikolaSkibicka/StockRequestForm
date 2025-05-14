const stockOptions = {
    trainers: [
        "Jordan 1 High OG Black/Red (Bred)", "Jordan 1 High OG Black/White (Chicago)", "Jordan 1 High OG Royal",
        "Jordan 1 High OG Shattered Backboard", "Jordan 1 High OG Turbo Green", "Jordan 1 Low OG Black/White",
        "Jordan 1 Low OG Red/White (Chicago)", "Jordan 1 Mid Black/Red", "Jordan 1 Low OG White/Gold",
        "Jordan 1 High OG Fearless", "Jordan 1 High OG Court Purple", "Jordan 1 High OG Smoke Grey",
        "Jordan 1 Low OG Gold Toe", "Jordan 1 High OG Green Python", "Jordan 1 High OG Royal Toe",
        "Jordan 1 High OG Obsidian", "Jordan 1 High OG Travis Scott", "Jordan 1 High OG Black/Yellow (Pollen)",
        "Jordan 4 Black Cats", "Jordan 4 Military Black", "Jordan 4 Pure Money", "Jordan 4 Fire Red",
        "Jordan 4 White/Navy", "Jordan 4 Red Thunder", "Jordan 4 University Blue", "Jordan 4 Cement",
        "Jordan 4 Bred", "Jordan 4 Pine Green", "Jordan 4 Lightning", "Jordan 4 Shimmer", "Jordan 4 Off-White",
        "Jordan 4 Cool Grey", "Jordan 4 Paris Saint-Germain", "Jordan 5 Fire Red", "Jordan 5 Retro OG Black/Red (Raging Bull)",
        "Jordan 5 Off-White", "Jordan 5 Camo", "Jordan 5 Grape", "Jordan 5 Bel Air", "Jordan 5 White/Black/Red",
        "Jordan 5 Bluebird", "Jordan 5 Oreo", "Jordan 5 Stealth", "Jordan 5 Eminem (rare release)",
        "Nike Air Max 90", "Nike Air Max 95", "Nike Air Max 270", "Nike Air Force 1 Low", "Nike Air Force 1 High",
        "Nike React Element 87", "Nike Zoom Freak 1 (Giannis Antetokounmpo)", "Nike Air Zoom Pegasus 37",
        "Nike SB Dunk Low", "Nike Blazer Mid", "Nike Air VaporMax", "Nike Air Zoom Freak 2",
        "Nike Air Max Plus (Tn)", "Nike SB Dunk High Syracuse", "Nike Air Jordan 1 Zoom",
        "Yeezy 350 V2", "Adidas UltraBoost", "Adidas NMD R1", "Nike Zoom KD13 (Kevin Durant)", "Nike Air Max 1 OG",
        "Nike React Presto", "Nike Air Huarache", "Nike Shox Turbo", "Adidas Superstar", "Adidas Yeezy 500",
        "Puma Clyde Court", "Other"
    ],
    clothes: ["Denim Tears Tracksuit Hoodie", "Denim Tears Bottoms", "Denim Tears Set", "Other"],
    colognes: ["Paco Rabanne 1 Million Eau de Toilette 100ml", "Other"],
    electronics: ["AirPods Pro", "Beats by Dre", "Other"]
};
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;
    }
    return hash;
}


const form = document.getElementById('stockRequestForm');
const categorySelect = document.getElementById('category');
const subcategoryContainer = document.getElementById('subcategoryContainer');
const descriptionBox = document.getElementById('requestDescription');

function updateSubcategory() {
    const category = categorySelect.value;
    const items = stockOptions[category] || [];
    let html = `<label for="stockItem">Select ${category.charAt(0).toUpperCase() + category.slice(1)} Item:</label>`;
    html += `<select name="stockItem" id="stockItem">`;
    items.forEach(item => {
        html += `<option value="${item}">${item}</option>`;
    });
    html += `</select>`;
    subcategoryContainer.innerHTML = html;

    const stockSelect = document.getElementById('stockItem');
    stockSelect.addEventListener('change', function() {
        if (this.value === 'Other') {
            descriptionBox.style.display = 'block';
        } else {
            descriptionBox.style.display = 'none';
        }
    });
}

categorySelect.addEventListener('change', updateSubcategory);
window.addEventListener('load', updateSubcategory);
let lastSubmitTime = 0;

form.addEventListener('submit', function (e) {
    e.preventDefault();

    const now = Date.now();
    if (now - lastSubmitTime < 3000) {
        alert('Please wait before submitting again.');
        return;
    }
const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            category: document.getElementById('category').value,
            stockItem: document.getElementById('stockItem').value,
            description: document.getElementById('description').value,
            captchaResponse: captchaResponse,
        };
    formData = new FormData(form);
    const data = Object.fromEntries(formData);

    // Always regenerate and verify CAPTCHA
    const recaptchaResponse = grecaptcha.getResponse();
    if (!recaptchaResponse) {
        alert('Please complete the reCAPTCHA');
        return;
    }

    if (hashString(data.captchaAnswer.trim()) !== correctCaptchaHash) {
        alert('CAPTCHA answer is incorrect. Please try again.');
        correctCaptchaHash = generateCaptcha(); // 🔁 regenerate
        return;
    }

    lastSubmitTime = now;
    data.recaptchaResponse = recaptchaResponse;

    fetch('https://stock-request-form.vercel.app/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
        .then(result => {
            grecaptcha.reset();
            
            if (result.success) {
                alert('Thank you for your request!');
            } else {
                alert(result.message || 'Error sending request. Please try again.');
                grecaptcha.reset();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('There was an issue submitting the form. Please try again later.');
            grecaptcha.reset();
        })
        .finally(() => {
            form.reset();
            correctCaptchaHash = generateCaptcha(); // 🔁 force regeneration
            updateSubcategory();
            grecaptcha.reset(); // 🔁 reset reCAPTCHA
        });
});
