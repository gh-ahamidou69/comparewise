# CompareWise

CompareWise est un prototype gratuit d'extension Chrome qui rassemble les informations disponibles sur plusieurs fiches produits et les affiche dans un tableau comparatif.

## Fonctionnalités du MVP

- Extraction initiale du nom, du prix, de la devise, de la marque, de l'image et des caractéristiques structurées lorsque ces informations sont présentes.
- Ajout manuel si une fiche n'est pas reconnue.
- Jusqu'à cinq produits par comparatif.
- Sauvegarde locale avec `chrome.storage.local`.
- Tableau comparatif à partir de deux produits.
- Export CSV.
- Aucun compte, serveur ou appel d'API externe.

## Installer dans Chrome

1. Téléchargez ou clonez ce dépôt.
2. Ouvrez `chrome://extensions` dans Google Chrome.
3. Activez **Mode développeur**.
4. Cliquez sur **Charger l'extension non empaquetée**.
5. Sélectionnez le dossier racine `comparewise` contenant `manifest.json`.
6. Épinglez CompareWise depuis le menu des extensions.

Aucune compilation ni installation de dépendances n'est nécessaire pour cette version.

## Tester

1. Ouvrez une fiche produit sur un site HTTP ou HTTPS.
2. Cliquez sur l'icône CompareWise.
3. Cliquez sur **Ajouter l'onglet actuel**.
4. Vérifiez les champs détectés puis cliquez sur **Ajouter**.
5. Ajoutez un deuxième produit pour afficher le tableau comparatif.
6. Essayez la saisie manuelle et l'export CSV.

Vous pouvez également utiliser **Saisie manuelle** pour ajouter des données de test.

## Limites connues

- L'extraction dépend du balisage et du contenu de chaque site. Elle ne fonctionne pas sur toutes les boutiques.
- Les prix peuvent être incomplets, localisés, variables ou conditionnés par des options. Vérifiez les informations sur le site marchand.
- Les frais de livraison, taxes et garanties ne sont pas encore détectés de façon fiable.
- L'extension ne contourne pas les connexions, CAPTCHA, paywalls ou restrictions anti-robot.
- Les pages internes protégées de Chrome, le Chrome Web Store et certains autres contextes ne sont pas accessibles au script.
- Ce prototype ne prétend pas vérifier en temps réel la disponibilité ou l'exactitude d'un prix.

## Confidentialité

Les produits sont stockés localement dans le profil Chrome de l'utilisateur. Le prototype n'envoie pas les données à un serveur et ne collecte pas l'historique de navigation. Le script de contenu extrait des informations de la page active pour répondre à une action de l'utilisateur.

## Permissions

- `activeTab` : accès à l'onglet actif après interaction avec l'extension.
- `storage` : sauvegarde locale du comparatif.
- `tabs` : identification de l'onglet actif.
- `scripting` : tentative de réinjection du script d'extraction si nécessaire.
- `scripting` : injecte le script d'extraction uniquement après le clic de l'utilisateur sur le bouton d'ajout. Aucun accès permanent à tous les sites n'est demandé.

## Développement

Cette version utilise du JavaScript natif et n'a pas besoin de Node.js, de compilation ou de dépendances.

Après une modification des fichiers, ouvrez `chrome://extensions` et cliquez sur le bouton de rechargement de CompareWise.

## Statut

Prototype MVP, non audité et non encore prêt pour une publication publique. Testez soigneusement le fonctionnement et les permissions avant toute diffusion.
