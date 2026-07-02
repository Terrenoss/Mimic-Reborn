import type { Messages } from "../lib/i18n";

export const fr: Messages = {
    // Écran de connexion
    "connect.idle.title": "Non connecté",
    "connect.idle.text": "Mimic n'arrive pas à joindre Conduit. Vérifie que Mimic Conduit est lancé sur ton PC et que ton téléphone est sur le même réseau Wi-Fi.",
    "connect.connecting.title": "Connexion...",
    "connect.connecting.text": "Contact de ton ordinateur en cours.",
    "connect.handshaking.title": "Presque fini !",
    "connect.handshaking.text": "Regarde ton ordinateur — Mimic demande l'autorisation de connecter cet appareil.",
    "connect.denied.title": "Connexion refusée",
    "connect.denied.text": "La connexion a été refusée sur ton ordinateur. Autorise cet appareil dans la fenêtre affichée par Mimic Conduit.",
    "connect.lost.title": "Connexion perdue",
    "connect.lost.text": "La connexion avec ton ordinateur a été perdue. Reconnexion...",
    "connect.retry": "Réessayer",

    // Lobby
    "lobby.title": "Salon",
    "lobby.findMatch": "Lancer la recherche",
    "lobby.invitePlayers": "Inviter des joueurs",
    "lobby.leave": "Quitter le salon",
    "lobby.roles.edit": "modifier",
    "lobby.member.promote": "Promouvoir",
    "lobby.member.allowInvite": "Autoriser à inviter",
    "lobby.member.revokeInvite": "Retirer l'invitation",
    "lobby.member.kick": "Exclure",

    // Création de salon
    "play.title": "Jouer",
    "play.subtitle": "Choisis un mode de jeu",
    "play.create": "Créer un salon",
    "play.loading": "Chargement des files...",
    "play.section.featured": "À la une",

    // Choix des rôles
    "roles.title": "Choisis tes positions",
    "roles.primary": "Principal : {role}",
    "roles.secondary": "Secondaire : {role}",
    "roles.confirm": "Confirmer",
    "roles.cancel": "Annuler",

    // Invitations (envoi)
    "invite.title": "Inviter des joueurs",
    "invite.placeholder": "Nom d'invocateur...",
    "invite.action": "Inviter",
    "invite.invited": "Invité",
    "invite.notFound": "Impossible de trouver « {name} ».",
    "invite.success": "{name} a été invité !",
    "invite.noSuggestions": "Aucun joueur récent à suggérer.",
    "invite.close": "Fermer",

    // Invitations (réception)
    "invites.invitesYou": "t'invite en {queue}",
    "invites.accept": "Accepter",
    "invites.decline": "Refuser",

    // File d'attente
    "queue.estimated": "Estimé : {time}",
    "queue.cancel": "Annuler",

    // Acceptation de partie
    "readyCheck.title": "Partie trouvée !",
    "readyCheck.accept": "Accepter",
    "readyCheck.decline": "Refuser",

    // Sélection des champions
    "cs.planning": "Annonce ton intention !",
    "cs.finalization": "Prépare-toi pour la partie !",
    "cs.waiting": "En attente...",
    "cs.youBanning": "Tu bannis...",
    "cs.youPicking": "Tu choisis...",
    "cs.otherBanning": "{name} bannit...",
    "cs.otherPicking": "{name} choisit...",
    "cs.banning": "Bannit...",
    "cs.picking": "Choisit...",
    "cs.enemyTeam": "Équipe ennemie",
    "cs.teammate": "Allié",
    "cs.enemy": "Ennemi",
    "cs.bench": "Banc",
    "cs.spells": "Sorts",
    "cs.runes": "Runes",
    "cs.skins": "Skins",
    "cs.reroll": "Relancer",

    // Sélecteur de champion
    "picker.banTitle": "Bannis un champion",
    "picker.pickTitle": "Choisis ton champion",
    "picker.search": "Rechercher...",
    "picker.ban": "Bannir",
    "picker.lockIn": "Verrouiller",
    "picker.close": "Fermer",
    "picker.done": "Terminé",

    // Sorts / skins / runes
    "spells.title": "Sorts d'invocateur",
    "spells.none": "Aucun",
    "skins.title": "Skins de {champion}",
    "skins.loading": "Chargement des skins...",
    "runes.title": "Runes",
    "runes.loading": "Chargement des runes...",
    "runes.noPage": "Aucune page de runes modifiable. Crée-en une dans le client d'abord.",
    "runes.secondary": "Secondaire : {tree}",
    "runes.shards": "Fragments de statistiques",

    // Réglages
    "settings.language": "Langue"
};
