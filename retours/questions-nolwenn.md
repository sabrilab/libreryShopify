# Questions de Nolwenn (12/10) et réponses proposées

Pour Sabri : ce sont ses questions hors modifications du site. Les réponses 1 et 2 viennent d'une recherche sur les pages
officielles Shopify, Klarna, PayPal et Alma (octobre 2026). Ce qui reste à tester est signalé.

---

## 1. Coffret découverte : comment les 40 € sont reportés sur la commande suivante ?

> « les 40 euros, ils seront reportés sur la prochaine commande… Est-ce que ce sera un code ? Est-ce que ça va être généré
> automatiquement ? … Raphique [Rafik] m'a expliqué que ce serait par code, c'était juste pour avoir la confirmation. »
> « Et si c'est par code, comment il est envoyé ? Est-ce que c'est à nous de le mettre dans le colis ? Est-ce que c'est envoyé
> par mail automatiquement ? Est-ce que c'est à nous d'envoyer le code ? » (vocaux 15:24)

**Réponse proposée :** oui, c'est un code, et ils n'ont rien à faire à la main.
- Un seul code (par ex. `COFFRET40`), réservé automatiquement dans Shopify aux clientes qui ont acheté le Discovery Set 2 ml
  dans les 90 derniers jours : 40 € déduits d'un flacon 100 ml, une fois par cliente. Pas d'appli, gratuit.
  (Prix confirmés par Nolwenn le 12/10 à 17:14 : Discovery Set 2 ml = 40 €.)
- Envoi :
  - le code s'affiche tout seul dans l'e-mail de confirmation de commande, seulement si la commande contient le coffret ;
  - et, s'ils le souhaitent, une petite carte imprimée glissée dans chaque coffret (toujours la même, pas de code à écrire).
- Condition : la cliente doit commander avec la même adresse e-mail que pour le coffret.
- Si un jour ils veulent un code différent pour chaque cliente (utile si beaucoup de coffrets sont offerts), on passe par
  Klaviyo : code unique envoyé par e-mail, gratuit jusqu'à 250 contacts puis environ 20 $/mois.
- À tester avant la mise en ligne : deux commandes test, une avec compte et une sans.

Détails techniques (pour nous) : segment `products_purchased MATCHES (id = <coffret>, date > -90d)`, réduction
« Montant fixe sur des produits », s'appliquant à des produits spécifiques en ne cochant que les variantes 100 ml, « une seule fois par commande », « une utilisation par client », bloc Liquid conditionnel dans la
notification « Confirmation de commande ». Shopify Flow ne sait pas créer de code ni écrire à la cliente nativement.

## 2. Paiement en 3 fois : c'est géré par Shopify, rien à gérer de leur côté ?

> « Pareil pour le paiement en trois fois, comment ça se passe ? Est-ce que directement c'est fait via Shopify et tout ça ?
> On n'a rien besoin de gérer ? » (vocal 15:26)

**Réponse proposée :** presque rien à gérer.
- On active **Klarna** dans Shopify Payments (un interrupteur, pas de contrat à part) : le paiement en 3 fois sans frais
  apparaît aux clientes éligibles. Le paiement en plusieurs fois « maison » de Shopify n'existe pas en France.
- Ils sont payés en totalité tout de suite ; c'est Klarna qui se fait rembourser par la cliente et qui porte le risque d'impayé.
- Coût : 4,99 % + 0,35 € par paiement Klarna (contre 1,5 % + 0,25 € pour une carte), frais non rendus en cas de remboursement.
- PayPal, déjà inclus dans Shopify Payments en France, propose aussi le 4X à ses clientes (de 20 € à 3 000 €).
- Alternative : Alma (le « 3 fois par carte » à la française), plus cher une fois ajoutés les frais Shopify.
- À savoir : de nouvelles règles sur le crédit à la consommation entrent en vigueur le 20/11/2026 (vérifications faites par
  Klarna / PayPal / Alma, prudence dans la façon d'afficher « paiement en 3 fois »). Sur les petits paniers (coffret), l'option
  peut ne pas s'afficher (minimums des prestataires).

## 3. Peut-on mettre une vidéo sur la page Skin Obsession ?

> « on verra si on met pas aussi une vidéo. Je sais pas si c'est possible d'incruster une vidéo, mais ce serait top » (vidéo 15:28)

**Réponse :** oui. Une vidéo peut remplacer la grande image d'ouverture de la collection (en boucle, sans le son). C'est fait
avec le film reçu le 12/10 (« Design sans titre-3.mp4 ») : il ouvre la page Skin Obsession, en boucle et sans le son.

## 4. Les petites légendes « fig. » : « je ne sais pas si c'était fait exprès ou pas »

**Réponse :** oui, c'était voulu : un clin d'œil aux légendes du catalogue papier, comme les « p. 32 », « p. 8 » qui y renvoyaient.
Les deux sont retirés partout (y compris les numéros de page du sommaire du catalogue sur l'accueil).

---

## Ce qu'elle a dit qu'elle enverrait
- Les prix de chaque produit.
- Photos des packagings, des coffrets et des discovery (même au téléphone).
- La liste des partenaires / boutiques pour la carte.
- De nouvelles photos pour la mosaïque Skin Obsession (« pas que des photos type modèle ») et pour Summer Vibes (« que ce soit
  pas tout le temps la blonde qui revienne »).
