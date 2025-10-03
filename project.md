# Projet — Application de gestion de projet (type Linear × Notion × Drive)

## Nom : "All. Done" 

## Vision
Une application qui centralise la gestion de projets, sous-projets, tâches, sous-tâches, documents et fichiers. 
Elle inclut des vues multiples (liste, tableau, kanban, gantt, calendrier), un éditeur riche avec IA (copilot) et un drive collaboratif.

## Directives de développement importantes
- **Utiliser au maximum shadcn/ui et les blocks disponibles sur [shadcn.io](https://shadcn.io/)** pour construire l’UI : roadmap, tables, kanban, forms, etc.  
- Éviter de réinventer des composants existants : privilégier l’import et la personnalisation des blocks shadcn.  
- **Ne pas écrire de code non fonctionnel, inutile ou fictif**. Chaque bout de code doit être opérationnel ou au minimum exécutable avec des données simulées réalistes.  
- Si une fonctionnalité n’est pas encore prête, utiliser un TODO clair plutôt qu’un code inventé.  
- L’objectif est d’avoir un socle robuste et cohérent, basé sur du code réutilisable, testé et maintenable.  

## Objectifs
- Centraliser la planification et le suivi des projets multi-équipes.
- Offrir une hiérarchie claire (Projet → Sous-projets → Tâches → Sous-tâches).
- Ajouter des documents et fichiers attachés aux projets/tâches.
- Fournir des vues adaptables : liste, table, kanban, gantt, calendrier.
- Intégrer un éditeur riche (specs, RFC, notes) avec assistance IA (reformulation, résumé, découpage en sous-tâches).
- Proposer un drive interne (fichiers, dossiers, versioning, partage).
- Assurer collaboration en temps réel (co-édition, commentaires, mentions, notifications).

## Utilisateurs cibles
- Équipes produit, dev, recherche.
- Freelances, étudiants, cabinets de conseil.

## Domain Model (Objets principaux)
- **Workspace** : organisation racine.
- **User** : profil, rôles, notifications.
- **Team** : sous-ensemble logique de users, workflows, projets.
- **Project** : objectif / conteneur. Peut contenir d’autres projets (sous-projets).
- **Task** : unité de travail. Peut contenir des sous-tâches.
- **Relations entre tâches** : blocks, depends, duplicates, relates.
- **Label/Tag** : étiquettes libres.
- **WorkflowState** : états personnalisables par équipe.
- **Cycle/Iteration** : sprint avec capacité et vélocité.
- **View** : liste enregistrée + configuration (filtres, tri, groupement).
- **Comment** : discussions, mentions, threads.
- **Attachment** : fichiers liés (drive ou externes).
- **Folder/File** : arborescence de drive.
- **Document** : page éditable, liée aux projets/tâches.
- **Notification** : alertes in-app, email.
- **AIJob** : requêtes IA (reformulation, split task…).
- **Permission/Role** : Owner/Admin/Maintainer/Member/Viewer.

## Fonctionnalités clés
- Création de projets hiérarchiques avec tâches/sous-tâches.
- Vues : liste, table, kanban, gantt, calendrier.
- Drive intégré : dossiers, fichiers, prévisualisation, partage.
- Éditeur riche type Plate.js avec copilot IA.
- IA : reformuler, résumer, découper tâches, générer descriptions, auto-labels.
- Collaboration : commentaires, mentions, notifications, co-édition docs.

## Workflows métier
1. **Création projet** → génération squelette (sous-projets, doc de vision, checklist initiale).
2. **Triage** : enrichir une tâche → lier projet/sous-projet → placer en Backlog/Todo.
3. **Planification** : vue gantt → définir dépendances, assigner équipe.
4. **Exécution** : kanban → transitions d’état, commentaires, pièces jointes.
5. **Suivi** : métriques (lead time, cycle time, throughput, WIP).
6. **Documentation** : lier docs et projets/tâches, co-édition temps réel.
7. **Partage** : liens read-only, permissions fines.

## IA intégrée
- **Reformulation/Correction** : améliorer textes de tâches/docs.
- **Résumé** : générer briefs de réunions, fiches rapides.
- **Découpage** : transformer une tâche en sous-tâches avec dépendances.
- **Génération** : description de tâche, squelette de document.

## Permissions et partage
- Granularité : Workspace, Team, Project, Task, Document, View.
- Rôles : Owner, Admin, Maintainer, Member, Viewer.
- Liens publics (read-only) optionnels avec expiration.

## Drive & stockage
- Folders/Files : versioning, preview.
- Attachments : liens internes/externes vers projets/tâches.
- Politiques de quota et rétention.