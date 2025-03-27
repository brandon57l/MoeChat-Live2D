export function showNotification(title, text, duration, type) {
    // Création de l'élément de notification
    const notifContainer = document.createElement('div');
    notifContainer.className = 'notif-cntainer slide-in';
    
    // Définir la couleur de fond selon le type
    switch (type) {
      case 'error':
        notifContainer.style.backgroundColor = '#dc3545'; // Rouge
        break;
      case 'success':
        notifContainer.style.backgroundColor = '#28a745'; // Vert
        break;
      case 'warning':
      default:
        notifContainer.style.backgroundColor = '#fec872'; // Orange / couleur par défaut
        break;
    }
  
    // Construction du contenu HTML de la notification
    notifContainer.innerHTML = `
      <div class="notif-icon"></div>
      <div class="msg-container">
        <div class="title">${title}</div>
        <div class="text">${text}</div>
      </div>
      <div class="close-notif"></div>
    `;
  
    // Ajout de la notification dans le body
    document.body.appendChild(notifContainer);
  
    // Ajout d'un événement sur le bouton de fermeture pour masquer la notification immédiatement
    notifContainer.querySelector('.close-notif').addEventListener('click', () => {
      hideNotification(notifContainer);
    });
  
    // Masquer automatiquement la notification après 'duration' millisecondes
    setTimeout(() => {
      hideNotification(notifContainer);
    }, duration);
}
  
function hideNotification(notif) {
    // Supprime l'animation d'apparition et ajoute celle de disparition
    notif.classList.remove('slide-in');
    notif.classList.add('slide-out');

    // Une fois l'animation terminée, retire la notification du DOM
    notif.addEventListener('animationend', () => {
        notif.remove();
    });
}
