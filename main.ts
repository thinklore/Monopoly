// src/main.ts

// Import actual runtime values (classes, consts, functions)
import { 
    MonopolyDealEngine, // Kept for type definition usage in the future or direct engine access for debugging
    CARD_DEFINITIONS, 
    PROPERTY_SET_SIZES, 
    findPlayerById, 
    calculatePlayerBankValue, 
    isSetComplete, 
    findCardInPlayersAssets 
} from './gameEngine.js'; 

import { NetworkManager } from './networkManager.js'; // <-- NEW: Import NetworkManager

// Import ONLY types/interfaces. These will be completely erased at compile time.
import type { 
    GameState, 
    Player, 
    Card, 
    PropertyCardDetails, 
    PropertyWildcardDetails, 
    RentCardDetails, 
    ActionCardDetails 
} from './gameEngine.js'; 

// --- DOM Elements ---
const lobbyContainer = document.getElementById('lobby-container'); // <-- NEW
const lobbyGameIdElem = document.getElementById('lobby-game-id'); // <-- NEW
const lobbyPlayerCountElem = document.getElementById('lobby-player-count'); // <-- NEW
const lobbyExpectedPlayerCountElem = document.getElementById('lobby-expected-player-count'); // <-- NEW
const lobbyPlayerListElem = document.getElementById('lobby-player-list'); // <-- NEW
const lobbyReadyBtn = document.getElementById('lobby-ready-btn') as HTMLButtonElement; // <-- NEW
const lobbyStartGameBtn = document.getElementById('lobby-start-game-btn') as HTMLButtonElement; // <-- NEW
const gameContainer = document.getElementById('game-container');
const opponentsZone = document.getElementById('opponents-zone');
const drawPile = document.getElementById('draw-pile');
const discardPile = document.getElementById('discard-pile');
const gameLogDisplay = document.getElementById('game-log-display');
const showLogBtn = document.getElementById('show-log-btn');
const logModal = document.getElementById('log-modal');
const logModalCloseBtn = logModal?.querySelector('.close-button');
const logEntries = document.getElementById('log-entries');

const currentPlayerZone = document.getElementById('current-player-zone');
const currentPlayerNameElem = document.getElementById('current-player-name');
const playsCountElem = document.getElementById('plays-count');
const handCountElem = document.getElementById('hand-count');
const handCardsElem = document.getElementById('hand-cards');
const bankValueElem = document.getElementById('bank-value');
const bankCardsElem = document.getElementById('bank-cards');
const propertySetsElem = document.getElementById('property-sets');
const endTurnBtn = document.getElementById('end-turn-btn') as HTMLButtonElement;

// Remove pass overlay logic, it's not needed for multi-tab
const passOverlay = document.getElementById('pass-overlay'); 
if (passOverlay) passOverlay.remove(); 

const actionModal = document.getElementById('action-modal');
const actionModalCloseBtn = actionModal?.querySelector('.action-modal-close');
const actionModalTitle = document.getElementById('action-modal-title');
const actionModalMessage = document.getElementById('action-modal-message');
const actionModalOptions = document.getElementById('action-modal-options');
const actionModalConfirmBtn = document.getElementById('action-modal-confirm-btn') as HTMLButtonElement;
const actionModalCancelBtn = document.getElementById('action-modal-cancel-btn') as HTMLButtonElement;

const winModal = document.getElementById('win-modal');
const winModalCloseBtn = winModal?.querySelector('.close-button'); 
const winModalTitle = document.getElementById('win-modal-title');
const winModalMessage = document.getElementById('win-modal-message');
const winModalRestartBtn = document.getElementById('win-modal-restart-btn');


// --- Game State & Engine Instance ---
let networkManager: NetworkManager; // <-- NEW: Instance of NetworkManager
let myPlayerId: string | null = null; // ID of the player this specific tab represents
let gameId: string | null = null; // ID of the shared game session (retrieved from NetworkManager)

let currentSelectedCard: Card | null = null; // For cards selected in hand for play/discard
let currentSelectedTargetId: string | null = null; // For player/property targets (often an ID from modal selection)
let currentSelectedTargetColor: string | null = null; // For wildcard colors (often a color string from modal selection)

// --- Utility Functions for Rendering ---

// Helper to create a card element
function createCardElement(card: Card, isPlayable: boolean = false, isSelectable: boolean = false): HTMLElement {
    const cardEl = document.createElement('div');
    cardEl.className = `card card-${card.id}`; // Add unique class for selection
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.type = card.type; // For CSS styling

    // Append card name and details
    let detailsContent = '';
    let cardColorForClass: string | undefined; // Variable to hold the color string for CSS class

    if (card.type === "Property") {
        detailsContent = (card.details as PropertyCardDetails).color;
        cardColorForClass = detailsContent; // Use actual color for class
    } else if (card.type === "PropertyWildcard") {
        detailsContent = (card.details as PropertyWildcardDetails).colors.join('/');
        // For PropertyWildcard, use the first color for the visual cue if not "Any"
        if ((card.details as PropertyWildcardDetails).colors.length > 0 && (card.details as PropertyWildcardDetails).colors[0] !== "Any") {
            cardColorForClass = (card.details as PropertyWildcardDetails).colors[0];
        }
    } else if (card.type === "Rent") {
        detailsContent = (card.details as RentCardDetails).colors.join('/');
        // For Rent cards, use the first color for the visual cue if not "Any"
        if ((card.details as RentCardDetails).colors.length > 0 && (card.details as RentCardDetails).colors[0] !== "Any") {
            cardColorForClass = (card.details as RentCardDetails).colors[0];
        }
    }

    cardEl.innerHTML = `
        <div class="bank-value">${card.bankValue}M</div>
        <div class="card-name">${card.name}</div>
        <div class="card-type">${card.type === "PropertyWildcard" && card.assignedColor ? `Wild (${card.assignedColor})` : card.type}</div>
        <div class="card-details">
            ${detailsContent}
        </div>
    `;

    // Add color band for properties/wildcards/rent - APPLY SANITIZATION HERE
    if (cardColorForClass) {
        const sanitizedColor = cardColorForClass.replace(/\s+/g, '-'); // Replace spaces with hyphens
        cardEl.classList.add(`color-band-${sanitizedColor}`); 
    }


    if (isPlayable) {
        cardEl.classList.add('playable-card');
        cardEl.onclick = () => handleCardClick(card);
    }
    if (isSelectable) {
        cardEl.classList.add('selectable-card');
        cardEl.onclick = () => handleModalOptionSelection(cardEl, card);
    }

    return cardEl;
}

// Resets selection states
function clearSelection() {
    if (currentSelectedCard) {
        document.querySelector(`.card-${currentSelectedCard.id}`)?.classList.remove('selected-for-action');
    }
    currentSelectedCard = null;
    currentSelectedTargetId = null;
    currentSelectedTargetColor = null;

    document.querySelectorAll('.modal-option-card.selected').forEach((el: Element) => el.classList.remove('selected'));
}

// Main render function for the entire UI
function renderGame(gameState: GameState): void {
    gameLogDisplay?.classList.remove('hidden'); // Ensure log button is always visible

    // --- NEW: Handle Lobby vs. In-Game View ---
    if (gameState.gameStatus === "LOBBY") {
        lobbyContainer?.classList.remove('hidden');
        gameContainer?.classList.add('hidden');
        winModal?.classList.remove('show'); // Hide win modal if somehow still showing

        renderLobby(gameState);
        updateModals(gameState, myPlayerId); // Check for any modals that might need to show (e.g., JSN in lobby phase is not expected but just in case)
        return;
    } else { // IN_GAME or GAME_OVER
        lobbyContainer?.classList.add('hidden');
        gameContainer?.classList.remove('hidden');
    }
    // --- End NEW: Handle Lobby vs. In-Game View ---

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const myPlayer = myPlayerId ? findPlayerById(gameState, myPlayerId) : undefined;

    // --- Render Opponents ---
    if (opponentsZone) {
        opponentsZone.innerHTML = ''; 
        gameState.players.forEach((player: Player, index: number) => {
            if (player.id === myPlayerId) return; // Skip my own player

            const opponentPanel = document.createElement('div');
            opponentPanel.className = 'opponent-panel';
            opponentPanel.dataset.playerId = player.id; 
            if (player.id === currentPlayer.id) {
                opponentPanel.classList.add('active-player'); // Highlight current player's panel
            } else {
                opponentPanel.classList.remove('active-player');
            }

            let propertiesHtml = '';
            for (const color in player.properties) {
                const numCards = player.properties[color].length;
                const isComplete = isSetComplete(player, color);
                const sanitizedColor = color.replace(/\s+/g, '-'); // Apply sanitization for opponent properties display
                propertiesHtml += `
                    <div class="property-color-indicator ${sanitizedColor} ${isComplete ? 'complete' : ''}">
                        ${color.substring(0,2).toUpperCase()} (${numCards}/${PROPERTY_SET_SIZES[color]})
                    </div>
                `;
            }

            opponentPanel.innerHTML = `
                <div>${player.name}</div>
                <div>Hand: ${player.hand.length}</div>
                <div>Bank: ${calculatePlayerBankValue(player)}M</div>
                <div class="opponent-properties">${propertiesHtml}</div>
            `;
            // Opponent panels are clickable only when awaiting a target that can be an opponent
            if (myPlayer && myPlayer.id === currentPlayer.id && gameState.gamePhase === "AWAIT_TARGET") {
                const context = gameState.actionContext;
                // Make opponent panel clickable only if action requires selecting an opponent,
                // AND a modal for OWN property selection (like Forced Deal step 1) is NOT currently blocking interaction.
                // This ensures we don't accidentally click an opponent when we're supposed to pick our own property.
                if ((context.requiredTarget === "COLLECT_FROM_PLAYER" || context.requiredTarget === "STEAL_PROPERTY" || context.requiredTarget === "STEAL_SET" || context.requiredTarget === "SWAP_PROPERTY") && !actionModal?.classList.contains('show')) {
                    (opponentPanel as HTMLElement).onclick = () => handleOpponentPanelClick(player.id);
                    (opponentPanel as HTMLElement).style.cursor = 'pointer'; // Visual cue
                } else {
                    (opponentPanel as HTMLElement).onclick = null; // Remove handler if not clickable
                    (opponentPanel as HTMLElement).style.cursor = 'default';
                }
            } else {
                (opponentPanel as HTMLElement).onclick = null; // Remove handler if not clickable
                (opponentPanel as HTMLElement).style.cursor = 'default';
            }
            opponentsZone.appendChild(opponentPanel);
        });
    }

    // --- Render Central Zone ---
    if (drawPile && discardPile) {
        drawPile.querySelector('.pile-count')!.textContent = gameState.deck.length.toString();
        discardPile.querySelector('.pile-count')!.textContent = gameState.discardPile.length.toString();

        const topDiscardCard = gameState.discardPile[gameState.discardPile.length - 1];
        const discardCardEl = discardPile.querySelector('.card') as HTMLElement;
        if (discardCardEl) {
            if (topDiscardCard) {
                discardCardEl.classList.remove('empty-pile');
                const cardType = topDiscardCard.type;
                let detailsContent = '';
                let cardColorForClass: string | undefined;

                if (cardType === "Property") {
                    detailsContent = (topDiscardCard.details as PropertyCardDetails).color;
                    cardColorForClass = detailsContent;
                } else if (cardType === "PropertyWildcard") {
                    detailsContent = (topDiscardCard.details as PropertyWildcardDetails).colors.join('/');
                     if ((topDiscardCard.details as PropertyWildcardDetails).colors.length > 0 && (topDiscardCard.details as PropertyWildcardDetails).colors[0] !== "Any") {
                        cardColorForClass = (topDiscardCard.details as PropertyWildcardDetails).colors[0];
                    }
                } else if (cardType === "Rent") {
                    detailsContent = (topDiscardCard.details as RentCardDetails).colors.join('/');
                    if ((topDiscardCard.details as RentCardDetails).colors.length > 0 && (topDiscardCard.details as RentCardDetails).colors[0] !== "Any") {
                        cardColorForClass = (topDiscardCard.details as RentCardDetails).colors[0];
                    }
                }

                discardCardEl.innerHTML = `
                    <div class="bank-value">${topDiscardCard.bankValue}M</div>
                    <div class="card-name">${topDiscardCard.name}</div>
                    <div class="card-type">${topDiscardCard.type}</div>
                    <div class="card-details">${detailsContent}</div>
                `;
                discardCardEl.dataset.type = topDiscardCard.type;
                Array.from(discardCardEl.classList).filter((c: string) => c.startsWith('color-band-')).forEach((c: string) => discardCardEl.classList.remove(c));
                if (cardColorForClass) {
                    const sanitizedColor = cardColorForClass.replace(/\s+/g, '-');
                    discardCardEl.classList.add(`color-band-${sanitizedColor}`);
                }
            } else {
                discardCardEl.classList.add('empty-pile');
                discardCardEl.innerHTML = '';
                discardCardEl.removeAttribute('data-type');
                Array.from(discardCardEl.classList).filter((c: string) => c.startsWith('color-band-')).forEach((c: string) => discardCardEl.classList.remove(c));
            }
        }
    }


    // --- Render Current Player Zone ---
    if (myPlayer) {
        currentPlayerNameElem!.textContent = myPlayer.name; // Use myPlayer for display
        playsCountElem!.textContent = gameState.playsRemaining.toString();

        // Hand
        handCountElem!.textContent = myPlayer.hand.length.toString();
        handCardsElem!.innerHTML = '';
        myPlayer.hand.forEach((card: Card) => {
            // Card is playable only if it's my turn AND in correct phase
            const isMyTurn = myPlayer.id === currentPlayer.id;
            const canPlayInMainPhase = isMyTurn && gameState.gamePhase === "MAIN_PLAY_PHASE" && gameState.playsRemaining > 0;
            const canDiscardInDiscardPhase = isMyTurn && gameState.gamePhase === "DISCARD_PHASE" && myPlayer.hand.length > 7;

            const isPlayable = canPlayInMainPhase || canDiscardInDiscardPhase;
            const cardEl = createCardElement(card, isPlayable);
            handCardsElem!.appendChild(cardEl);
        });

        // Bank
        bankValueElem!.textContent = `${calculatePlayerBankValue(myPlayer)}M`;
        bankCardsElem!.innerHTML = '';
        myPlayer.bank.forEach((card: Card) => {
            const cardEl = createCardElement(card);
            bankCardsElem!.appendChild(cardEl);
            // Allow selecting cards from bank for payment if it's my turn to pay
            if (myPlayer.id === gameState.actionContext.owingPlayerId && gameState.gamePhase === "AWAIT_PAYMENT") {
                 (cardEl as HTMLElement).onclick = () => handleModalOptionSelection(cardEl, card);
                 (cardEl as HTMLElement).style.cursor = 'pointer';
            } else {
                 (cardEl as HTMLElement).style.cursor = 'default';
            }
        });

        // Properties
        propertySetsElem!.innerHTML = '';
        for (const color in myPlayer.properties) {
            const propertySet = myPlayer.properties[color];
            const isComplete = isSetComplete(myPlayer, color);
            const sanitizedColor = color.replace(/\s+/g, '-'); // Apply sanitization for property set display

            const setEl = document.createElement('div');
            setEl.className = `property-set ${sanitizedColor} ${isComplete ? 'complete' : ''}`;
            setEl.dataset.color = color; 

            let housesHotelsHtml = '';
            if (myPlayer.housesAndHotels[color] === 1) housesHotelsHtml = '(House)';
            if (myPlayer.housesAndHotels[color] === 2) housesHotelsHtml = '(Hotel)';

            setEl.innerHTML = `
                <div class="property-set-title color-band-${sanitizedColor}">${color} Set ${housesHotelsHtml} (${propertySet.length}/${PROPERTY_SET_SIZES[color]})</div>
                <div class="property-set-cards"></div>
            `;
            const cardsContainer = setEl.querySelector('.property-set-cards');
            if (cardsContainer) {
                propertySet.forEach((card: Card) => {
                    const cardEl = createCardElement(card);
                    cardsContainer.appendChild(cardEl);
                    // Allow selecting property cards for payment if it's my turn to pay AND set is not complete
                    if (myPlayer.id === gameState.actionContext.owingPlayerId && gameState.gamePhase === "AWAIT_PAYMENT" && !isSetComplete(myPlayer, color)) {
                        (cardEl as HTMLElement).onclick = () => handleModalOptionSelection(cardEl, card);
                        (cardEl as HTMLElement).style.cursor = 'pointer';
                    } else if (myPlayer.id === currentPlayer.id && gameState.gamePhase === "MAIN_PLAY_PHASE" && currentSelectedCard?.cardDefId === "ACTION_FORCED_DEAL" && !isComplete) {
                        // This is for the *first* step of Forced Deal, selecting *own* property from properties zone.
                        // It must be in MAIN_PLAY_PHASE for initial card play
                        // This specific interaction happens *before* the engine goes into AWAIT_TARGET.
                        (cardEl as HTMLElement).onclick = () => handleModalOptionSelection(cardEl, card);
                        (cardEl as HTMLElement).style.cursor = 'pointer';
                    } else {
                         (cardEl as HTMLElement).style.cursor = 'default';
                    }
                });
            }
            propertySetsElem!.appendChild(setEl);

            // Allow selecting complete set for House/Hotel placement
            if (myPlayer.id === currentPlayer.id && gameState.gamePhase === "MAIN_PLAY_PHASE" && (currentSelectedCard?.cardDefId === "ACTION_HOUSE" || currentSelectedCard?.cardDefId === "ACTION_HOTEL") && isSetComplete(myPlayer, color)) {
                 (setEl as HTMLElement).onclick = () => handleModalOptionSelection(setEl, null, color); // `null` for card, pass color
                 (setEl as HTMLElement).style.cursor = 'pointer';
            } else {
                (setEl as HTMLElement).style.cursor = 'default';
            }
        }
    }

    // --- Control Buttons ---
    // End Turn button enabled only if it's my turn AND in Main Play Phase AND 0 plays remaining
    if (endTurnBtn) {
        endTurnBtn.disabled = !(myPlayer && myPlayer.id === currentPlayer.id && gameState.gamePhase === "MAIN_PLAY_PHASE" && gameState.playsRemaining === 0);
    }

    // --- Modals and Overlays ---
    updateModals(gameState, myPlayerId);
}

// --- NEW: Render Lobby Function ---
function renderLobby(gameState: GameState): void {
    if (!lobbyGameIdElem || !lobbyPlayerCountElem || !lobbyExpectedPlayerCountElem || !lobbyPlayerListElem || !lobbyReadyBtn || !lobbyStartGameBtn) return;

    lobbyGameIdElem.textContent = networkManager.getGameId();
    lobbyPlayerCountElem.textContent = gameState.players.length.toString();
    lobbyExpectedPlayerCountElem.textContent = gameState.expectedPlayerCount.toString();

    lobbyPlayerListElem.innerHTML = '';
    const myPlayer = myPlayerId ? findPlayerById(gameState, myPlayerId) : undefined;

    gameState.players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = `${player.name} ${player.isReady ? "(Ready)" : "(Not Ready)"}`;
        if (player.id === myPlayerId) {
            li.classList.add('my-player'); // Highlight my own player in lobby
        }
        if (player.isReady) {
            li.classList.add('ready');
        } else {
            li.classList.remove('ready');
        }
        lobbyPlayerListElem.appendChild(li);
    });

    // Update "Ready" button state
    if (myPlayer && myPlayer.name && !myPlayer.name.startsWith("Player ")) { // Can only be ready if named
        lobbyReadyBtn.disabled = false;
        lobbyReadyBtn.textContent = myPlayer.isReady ? "Unready" : "Ready";
        lobbyReadyBtn.onclick = () => {
            networkManager.sendPlayerAction("SET_READY_STATUS", { isReady: !myPlayer.isReady });
        };
    } else {
        lobbyReadyBtn.disabled = true;
        lobbyReadyBtn.textContent = "Ready (Choose Name First)";
    }

    // Update "Start Game" button state (only for host)
    if (networkManager.getIsHost()) {
        lobbyStartGameBtn.classList.remove('hidden');
        const allPlayersJoined = gameState.players.length === gameState.expectedPlayerCount;
        const allPlayersReady = gameState.players.every(p => p.isReady && !p.name.startsWith("Player ")); // Ensure names are set too
        lobbyStartGameBtn.disabled = !(allPlayersJoined && allPlayersReady);
        lobbyStartGameBtn.onclick = () => {
            networkManager.sendPlayerAction("START_GAME", {});
        };
    } else {
        lobbyStartGameBtn.classList.add('hidden');
    }
}

// --- Event Handlers ---

function handleCardClick(card: Card) {
    const gameState = networkManager.getGameState(); // <-- NEW: Get state from NetworkManager
    if (!gameState || gameState.gameStatus !== "IN_GAME") return; // <-- NEW: Only allow if IN_GAME
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    const isMyTurnForMainActions = (networkManager.getMyPlayerId() && currentPlayer.id === networkManager.getMyPlayerId());

    if (!isMyTurnForMainActions) {
        console.warn("Card clicked, but it's not your turn or not in a phase allowing direct card play/discard.");
        return;
    }

    if (gameState.gamePhase === "DISCARD_PHASE") {
        const myPlayer = findPlayerById(gameState, networkManager.getMyPlayerId()!);
        if (!myPlayer || myPlayer.hand.length <= 7) { 
            console.warn("Discard phase, but hand is already <= 7. Ignoring discard click.");
            return;
        }
        clearSelection();
        currentSelectedCard = card;
        document.querySelector(`.card-${card.id}`)?.classList.add('selected-for-action');
        showActionModal(`Discard ${card.name}?`, `Your hand has ${myPlayer.hand.length} cards, discard down to 7.`, [
            { id: 'discard', label: 'Discard', type: 'button' },
            { id: 'cancel_discard', label: 'Cancel Selection', type: 'button' } 
        ], (selectedId: string | null, selectedOption?: ModalOption) => {
            if (selectedId === 'discard') {
                networkManager.sendPlayerAction("DISCARD_CARD", { cardId: card.id }); // <-- NEW: Send action via NetworkManager
            } else if (selectedId === 'cancel_discard') {
                clearSelection();
                const currentGameState = networkManager.getGameState();
                if(currentGameState) renderGame(currentGameState); // Re-render to clear selected card
                return; 
            }
        });
        return;
    }

    if (gameState.gamePhase !== "MAIN_PLAY_PHASE") {
        console.warn("Card clicked in unexpected phase: " + gameState.gamePhase);
        return;
    }

    if (gameState.playsRemaining <= 0) {
        console.warn("No plays remaining for this turn.");
        return;
    }

    clearSelection();
    currentSelectedCard = card;
    document.querySelector(`.card-${card.id}`)?.classList.add('selected-for-action'); 

    if (card.type === "Money" || card.type === "Property") {
        networkManager.sendPlayerAction("PLAY_CARD", { cardId: card.id }); // <-- NEW
        clearSelection();
    } 
    else if (card.type === "Action" || card.type === "Rent" || card.type === "PropertyWildcard") {
        handleComplexCardPlay(card);
    } else {
        console.warn(`Attempted to play unknown card type: ${(card as any).type}`);
        clearSelection();
    }
}

function handleComplexCardPlay(card: Card) {
    const gameState = networkManager.getGameState();
    if (!gameState || gameState.gameStatus !== "IN_GAME") return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    let message = "";
    let options: ModalOption[] = [];

    // --- Property Wildcard ---
    if (card.type === "PropertyWildcard") {
        message = `Choose a color for your ${card.name}:`;
        (card.details as PropertyWildcardDetails).colors.forEach((color: string) => {
            if (color === "Any") {
                Object.keys(PROPERTY_SET_SIZES).forEach((propColor: string) => {
                    options.push({ id: `color-${propColor}`, label: propColor, type: 'color', color: propColor });
                });
            } else {
                options.push({ id: `color-${color}`, label: color, type: 'color', color: color });
            }
        });
        showActionModal(`Assign Color for ${card.name}`, message, options, (selectionId: string | null, selectedOption?: ModalOption) => {
             if (selectionId && selectedOption && selectedOption.color) {
                networkManager.sendPlayerAction("PLAY_CARD", { cardId: card.id, chosenColor: selectedOption.color });
            } else {
                networkManager.sendPlayerAction("CANCEL_ACTION", {}); // User cancelled selection
            }
            hideActionModal();
            clearSelection();
        }, true);
        return;
    }

    // --- Rent Card ---
    if (card.type === "Rent") {
        // Rent cards require both a target player and a chosen color at the moment of play.
        message = `Select a target player and the property color to charge rent for:`;
        gameState.players.forEach((p: Player) => {
            if (p.id !== currentPlayer.id) {
                options.push({ id: `player-${p.id}`, label: p.name, type: 'player', player: p });
            }
        });
        (card.details as RentCardDetails).colors.forEach((color: string) => {
            if (color === "Any") {
                Object.keys(PROPERTY_SET_SIZES).forEach((propColor: string) => {
                    options.push({ id: `color-${propColor}`, label: propColor, type: 'color', color: propColor });
                });
            } else {
                options.push({ id: `color-${color}`, label: color, type: 'color', color: color });
            }
        });
        showActionModal(`Play ${card.name}`, message, options, (selectionId: string | null, selectedOption?: ModalOption) => {
            // Need to ensure BOTH player and color are selected for Rent
            if (currentSelectedTargetId && currentSelectedTargetColor) {
                networkManager.sendPlayerAction("PLAY_CARD", {
                    cardId: card.id,
                    targetPlayerId: currentSelectedTargetId,
                    chosenColor: currentSelectedTargetColor
                });
            } else {
                console.error("Rent card play requires both target player and chosen color, or was cancelled.");
                networkManager.sendPlayerAction("CANCEL_ACTION", {}); // Cancel if not both selected
            }
            hideActionModal();
            clearSelection();
        }, true);
        return;
    }

    // --- Action Cards ---
    if (card.type === "Action") {
        const actionType = (card.details as ActionCardDetails).actionType;
        switch (actionType) {
            case "SWAP_PROPERTY": // Forced Deal: First step is to select player's own property
                message = `Select one of your properties to swap with an opponent's property:`;
                const myPlayer = findPlayerById(gameState, networkManager.getMyPlayerId()!);
                if (!myPlayer) { console.error("My player not found for action card."); return; }
                for (const color in myPlayer.properties) {
                    if (!isSetComplete(myPlayer, color)) { // Cannot swap from complete set
                        myPlayer.properties[color].forEach((propCard: Card) => {
                            options.push({ id: `my-prop-${propCard.id}`, label: propCard.name, type: 'property-card', card: propCard });
                        });
                    }
                }
                if (options.length === 0) {
                    message = `You have no properties available to swap.`;
                    showActionModal(card.name, message, [], (selectionId: string | null) => {
                        networkManager.sendPlayerAction("CANCEL_ACTION", {}); // User cancelled
                        hideActionModal();
                        clearSelection();
                    }, false, 'confirm-only'); // Allow acknowledging and cancelling
                    return;
                }
                showActionModal(`Play ${card.name}`, message, options, (selectionId: string | null, selectedOption?: ModalOption) => {
                    if (selectionId && selectedOption && selectedOption.card) {
                        networkManager.sendPlayerAction("PLAY_CARD", {
                            cardId: card.id,
                            sourcePropertyId: selectedOption.card.id // This is crucial for Forced Deal's first step
                        });
                    } else {
                        networkManager.sendPlayerAction("CANCEL_ACTION", {}); // User cancelled
                    }
                    hideActionModal();
                    clearSelection();
                }, true);
                break;

            case "ADD_HOUSE": // House: Directly asks for own complete set
            case "ADD_HOTEL": // Hotel: Directly asks for own complete set
                message = `Select one of your COMPLETE property sets to add a ${card.name} to:`;
                const myPlayerForHouseHotel = findPlayerById(gameState, networkManager.getMyPlayerId()!);
                if (!myPlayerForHouseHotel) { console.error("My player not found for action card."); return; }
                for (const color in myPlayerForHouseHotel.properties) {
                    // Check if house/hotel can be added (e.g., house if none/hotel, hotel if house exists)
                    if (isSetComplete(myPlayerForHouseHotel, color)) {
                        const currentHousesHotels = myPlayerForHouseHotel.housesAndHotels[color] || 0;
                        if (actionType === "ADD_HOUSE" && currentHousesHotels === 0) { // Can add house if none
                            options.push({ id: `set-${color}`, label: `${color} Set`, type: 'property-set', color: color });
                        } else if (actionType === "ADD_HOTEL" && currentHousesHotels === 1) { // Can add hotel if house exists
                            options.push({ id: `set-${color}`, label: `${color} Set`, type: 'property-set', color: color });
                        }
                    }
                }
                if (options.length === 0) {
                    message = `You have no eligible complete sets to add a ${card.name} to.`;
                    showActionModal(card.name, message, [], (selectionId: string | null) => {
                        networkManager.sendPlayerAction("CANCEL_ACTION", {}); // User cancelled
                        hideActionModal();
                        clearSelection();
                    }, false, 'confirm-only');
                    return;
                }
                showActionModal(`Play ${card.name}`, message, options, (selectionId: string | null, selectedOption?: ModalOption) => {
                    if (selectionId && selectedOption && selectedOption.color) {
                         networkManager.sendPlayerAction("PLAY_CARD", { cardId: card.id, chosenColor: selectedOption.color });
                    } else {
                        networkManager.sendPlayerAction("CANCEL_ACTION", {}); // User cancelled
                    }
                    hideActionModal();
                    clearSelection();
                }, true);
                break;

            case "STEAL_SET": // Deal Breaker: Play card, engine sets AWAIT_TARGET. UI clicks opponent.
            case "STEAL_PROPERTY": // Sly Deal: Play card, engine sets AWAIT_TARGET. UI clicks opponent.
            case "COLLECT_FROM_PLAYER": // Debt Collector: Play card, engine sets AWAIT_TARGET. UI clicks opponent.
                // These actions simply play the card, and the engine will transition to AWAIT_TARGET.
                // The UI will then enable clicking on opponent panels via renderGame,
                // and `handleOpponentPanelClick` will open the specific target selection modal.
                networkManager.sendPlayerAction("PLAY_CARD", { cardId: card.id });
                clearSelection();
                break;

            case "COLLECT_FROM_ALL": // Birthday Card: No target, auto-resolves
            case "DRAW_TWO": // Pass Go: No target, auto-resolves
            case "DOUBLE_RENT": // Double The Rent: No target, auto-resolves
                networkManager.sendPlayerAction("PLAY_CARD", { cardId: card.id });
                clearSelection();
                break;

            default:
                console.warn(`Attempted to play unhandled action card type: ${actionType}`);
                clearSelection();
                break;
        }
    } else { // Should not happen for non-Money/Property/PW/Rent/Action cards
        console.warn(`Attempted to play unknown card type: ${(card as any).type}`);
        clearSelection();
    }
}


function handleOpponentPanelClick(opponentId: string) {
    const gameState = networkManager.getGameState();
    if (!gameState || gameState.gameStatus !== "IN_GAME") return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex]; 

    if (!networkManager.getMyPlayerId() || currentPlayer.id !== networkManager.getMyPlayerId()) {
        console.warn("Not your turn to target opponents.");
        return;
    }

    if (gameState.gamePhase === "AWAIT_TARGET") {
        const context = gameState.actionContext;
        const targetPlayer = findPlayerById(networkManager.getGameState()!, opponentId);
        if (!targetPlayer) return;

        let options: ModalOption[] = [];
        let message = ``;
        let modalTitle = context.actionDef?.name || "Select Target"; // Now 'name' is guaranteed to exist on actionDef
        let isDirectConfirmAction = false; // Flag for actions like Debt Collector which only need player confirmation

        switch(context.requiredTarget) {
            case "COLLECT_FROM_PLAYER": // Debt Collector
                message = `Confirm collecting 5M from ${targetPlayer.name}?`;
                isDirectConfirmAction = true;
                break;
            case "STEAL_SET": // Deal Breaker
                message = `Select a complete property set to steal from ${targetPlayer.name}:`;
                for (const color in targetPlayer.properties) {
                    if (isSetComplete(targetPlayer, color)) {
                        options.push({ id: `set-${color}`, label: `${color} Set`, type: 'property-set', color: color });
                    }
                }
                if (options.length === 0) message = `${targetPlayer.name} has no complete sets to steal.`;
                break;
            case "STEAL_PROPERTY": // Sly Deal
                message = `Select a property to steal from ${targetPlayer.name} (cannot be from a complete set):`;
                for (const color in targetPlayer.properties) {
                    if (!isSetComplete(targetPlayer, color)) {
                        targetPlayer.properties[color].forEach((card: Card) => {
                            options.push({ id: `prop-${card.id}`, label: card.name, type: 'property-card', card: card });
                        });
                    }
                }
                if (options.length === 0) message = `${targetPlayer.name} has no non-complete properties to steal.`;
                break;
            case "SWAP_PROPERTY": // Forced Deal (this is the second step, asking for opponent's property)
                const myPlayer = findPlayerById(gameState, networkManager.getMyPlayerId()!);
                const sourceCard = findCardInPlayersAssets(myPlayer!, context.sourcePropertyId || '');
                message = `Select a property from ${targetPlayer.name} to swap with your ${sourceCard?.name || 'selected property'}:`;
                 for (const color in targetPlayer.properties) {
                    if (!isSetComplete(targetPlayer, color)) {
                        targetPlayer.properties[color].forEach((card: Card) => {
                            options.push({ id: `prop-${card.id}`, label: card.name, type: 'property-card', card: card });
                        });
                    }
                }
                if (options.length === 0) message = `${targetPlayer.name} has no non-complete properties to swap.`;
                break;
            default:
                console.warn(`handleOpponentPanelClick: Unhandled requiredTarget ${context.requiredTarget} or not an opponent-targetable action.`);
                return; // Do not open modal if this click doesn't fit context
        }

        showActionModal(modalTitle, message, options, (selectionId: string | null, selectedOption?: ModalOption) => {
            if (selectionId === 'confirm' && isDirectConfirmAction) { // For direct confirmation actions like Debt Collector
                networkManager.sendPlayerAction("SELECT_TARGET", {
                    targetPlayerId: targetPlayer!.id,
                    targetCardId: context.cardId // The original action card ID
                });
            } else if (selectionId && selectedOption) { // For actions requiring a specific property/set selection
                let finalTargetPropertyId: string | null = null;
                let finalChosenColor: string | null = null;

                if (selectedOption.type === 'property-card' && selectedOption.card) {
                    finalTargetPropertyId = selectedOption.card.id;
                } else if (selectedOption.type === 'property-set' && selectedOption.color) {
                    finalChosenColor = selectedOption.color;
                }
                // Ensure a valid target (property or set color) was selected for non-direct-confirm actions
                if (!finalTargetPropertyId && !finalChosenColor) {
                    alert("Please select a target property or set.");
                    return; // Keep modal open
                }

                networkManager.sendPlayerAction("SELECT_TARGET", {
                    targetPlayerId: targetPlayer!.id,
                    targetPropertyId: finalTargetPropertyId,
                    chosenColor: finalChosenColor,
                    targetCardId: context.cardId,
                    sourcePropertyId: context.sourcePropertyId // Pass original source for Forced Deal
                });
            } else { // User clicked cancel
                networkManager.sendPlayerAction("CANCEL_ACTION", {});
            }
            hideActionModal();
            clearSelection();
        }, !isDirectConfirmAction, isDirectConfirmAction ? 'confirm-only' : 'default'); // Enable selection confirm if options exist, otherwise show confirm-only
    }
}

function handleModalOptionSelection(element: HTMLElement, card: Card | null = null, color: string | null = null) {
    const gameState = networkManager.getGameState();
    if (!gameState) return; // Should not happen

    // Determine if this is the Rent modal (requires multi-selection)
    const isRentModalActive = gameState.gamePhase === "MAIN_PLAY_PHASE" && currentSelectedCard?.type === "Rent";

    if (isRentModalActive) {
        // Special handling for Rent: allow selecting a player AND a color simultaneously.
        if (element.dataset.optionId?.startsWith('player-')) {
            // Clear only previously selected player, not color
            const previouslySelectedPlayerEl = actionModalOptions?.querySelector('.modal-option-card[data-option-id^="player-"].selected');
            if (previouslySelectedPlayerEl) previouslySelectedPlayerEl.classList.remove('selected');
            element.classList.add('selected');
            currentSelectedTargetId = element.dataset.optionId.split('-')[1]; // Set player ID
        } else if (element.dataset.optionId?.startsWith('color-')) {
            // Clear only previously selected color, not player
            const previouslySelectedColorEl = actionModalOptions?.querySelector('.modal-option-card[data-option-id^="color-"].selected');
            if (previouslySelectedColorEl) previouslySelectedColorEl.classList.remove('selected');
            element.classList.add('selected');
            currentSelectedTargetColor = color; // Set color string
        } else {
            // For other unexpected types in Rent modal, revert to single selection logic temporarily
            console.warn("Unexpected option type selected in Rent modal context.");
            actionModalOptions?.querySelectorAll('.selected').forEach((el: Element) => el.classList.remove('selected'));
            element.classList.add('selected'); // Highlight just this one
            currentSelectedCard = card;
            currentSelectedTargetId = card?.id || null;
            currentSelectedTargetColor = color;
        }
    } else {
        // Default behavior for all other modals (discard, single target selection, payment, House/Hotel, Forced Deal first step)
        // Only one item should be selected at a time.
        actionModalOptions?.querySelectorAll('.selected').forEach((el: Element) => el.classList.remove('selected'));
        element.classList.add('selected');

        if (card) {
            currentSelectedCard = card;
            currentSelectedTargetId = card.id; // Often the card ID itself is the target ID (e.g., payment, your property for Forced Deal)
            currentSelectedTargetColor = null; // Clear color for card selection
        } else if (color) {
            currentSelectedTargetColor = color; // Assign the color string (e.g., for Property Wildcard, House/Hotel)
            currentSelectedCard = null; // Clear card
            currentSelectedTargetId = null; // Clear target ID (if it was a card, it's now a color selection)
        } else if (element.dataset.optionId?.startsWith('player-')) { // For general player selection (not Rent)
            currentSelectedTargetId = element.dataset.optionId.split('-')[1]; // Extract player ID
            currentSelectedCard = null;
            currentSelectedTargetColor = null;
        } else {
            // Fallback for unexpected options, just clear everything
            currentSelectedCard = null;
            currentSelectedTargetId = null;
            currentSelectedTargetColor = null;
        }
    }

    if (actionModalConfirmBtn) {
        actionModalConfirmBtn.classList.remove('hidden'); // Show confirm button once something is selected
    }
}


// --- Modal Display Logic ---
interface ModalOption {
    id: string;
    label: string;
    type: string; 
    card?: Card;
    player?: Player;
    color?: string;
}

let currentModalOnConfirm: ((selectionId: string | null, selectedOption?: ModalOption) => void) | null = null;

function showActionModal(title: string, message: string, options: ModalOption[] = [], onConfirm: (selectionId: string | null, selectedOption?: ModalOption) => void, enableSelectionConfirm: boolean = false, displayType: 'default' | 'confirm-only' = 'default') {
    if (!actionModal || !actionModalTitle || !actionModalMessage || !actionModalOptions || !actionModalConfirmBtn || !actionModalCancelBtn) return;

    actionModalTitle.textContent = title;
    actionModalMessage.textContent = message;
    actionModalOptions.innerHTML = ''; 

    // Reset button visibility
    actionModalConfirmBtn.classList.add('hidden');
    actionModalCancelBtn.classList.remove('hidden');

    // Remove previous listeners to prevent duplicates
    actionModalConfirmBtn.onclick = null;
    actionModalCancelBtn.onclick = null;
    if (actionModalCloseBtn) (actionModalCloseBtn as HTMLElement).onclick = null;

    currentModalOnConfirm = onConfirm; 

    if (displayType === 'confirm-only') {
        actionModalConfirmBtn.textContent = "Confirm";
        actionModalCancelBtn.textContent = "Cancel";
        actionModalOptions.classList.add('hidden');
        actionModalConfirmBtn.classList.remove('hidden'); // Always show confirm for 'confirm-only'
    } else {
        actionModalOptions.classList.remove('hidden');
        actionModalConfirmBtn.textContent = "Confirm Selection";
        actionModalCancelBtn.textContent = "Cancel Action";

        options.forEach((option: ModalOption) => {
            const optionEl = document.createElement('div');
            optionEl.className = 'modal-option-card';
            optionEl.dataset.optionId = option.id;

            if (option.type === 'player') {
                optionEl.innerHTML = `<div>Player: ${option.label}</div>`;
            } else if ((option.type === 'card' || option.type === 'property-card') && option.card) {
                optionEl.innerHTML = `<div>${option.label}</div>`;
                const cardEl = createCardElement(option.card);
                cardEl.style.width = '50px';
                cardEl.style.height = '75px';
                cardEl.style.boxShadow = 'none';
                optionEl.appendChild(cardEl);
            } else if (option.type === 'property-set' && option.color) {
                const sanitizedColor = option.color.replace(/\s+/g, '-');
                 optionEl.innerHTML = `<div>Set: ${option.label}</div><div class="property-color-indicator ${sanitizedColor}"></div>`;
                 (optionEl.querySelector('.property-color-indicator') as HTMLElement).style.display = 'block'; 
                 (optionEl.querySelector('.property-color-indicator') as HTMLElement).style.margin = 'auto';
            } else if (option.type === 'color' && option.color) {
                const sanitizedColor = option.color.replace(/\s+/g, '-');
                optionEl.innerHTML = `<div>Color: ${option.label}</div><div class="property-color-indicator ${sanitizedColor}"></div>`;
                (optionEl.querySelector('.property-color-indicator') as HTMLElement).style.display = 'block'; 
                (optionEl.querySelector('.property-color-indicator') as HTMLElement).style.margin = 'auto';
            } else {
                 optionEl.innerHTML = `<div>${option.label}</div>`;
                 optionEl.classList.add('card-placeholder');
            }

            (optionEl as HTMLElement).onclick = () => handleModalOptionSelection(optionEl, option.card || null, option.color || null); 
            actionModalOptions.appendChild(optionEl);
        });
    }

    actionModal.classList.add('show');

    actionModalConfirmBtn.onclick = () => { 
        let selectedOptionData: ModalOption | undefined;
        if (enableSelectionConfirm) {
            const selectedElement = actionModalOptions?.querySelector('.modal-option-card.selected') as HTMLElement; 
            if (selectedElement) {
                const optionId = selectedElement.dataset.optionId; 
                selectedOptionData = options.find((o: ModalOption) => o.id === optionId);
            } else {
                console.warn("No option selected for confirm button with enableSelectionConfirm.");
                if (options.length > 0) { // If options exist and selection is required, force it
                    alert("Please select an option!"); // <-- Added user alert
                    return;
                }
                selectedOptionData = { id: 'confirm', label: 'Confirm', type: 'button' }; // Allow confirm without selection if no options
            }
        } else if (displayType === 'confirm-only') {
            selectedOptionData = { id: 'confirm', label: 'Confirm', type: 'button' };
        }
        
        if (currentModalOnConfirm) currentModalOnConfirm(selectedOptionData ? selectedOptionData.id : null, selectedOptionData);
    };

    actionModalCancelBtn.onclick = () => { 
        if (currentModalOnConfirm) currentModalOnConfirm('cancel', undefined);
    };

    if (actionModalCloseBtn) (actionModalCloseBtn as HTMLElement).onclick = () => {
        if (currentModalOnConfirm) currentModalOnConfirm('cancel', undefined);
    };
}


function hideActionModal() {
    actionModal?.classList.remove('show');
    currentSelectedCard = null;
    currentSelectedTargetId = null;
    currentSelectedTargetColor = null;
    if (actionModalOptions) actionModalOptions.innerHTML = '';
    actionModalConfirmBtn?.classList.add('hidden');
    actionModalCancelBtn?.classList.add('hidden');

    currentModalOnConfirm = null; 
}

// Central function to update UI after any game state change
// This function is now ONLY called by the NetworkManager's onGameStateUpdate callback
// It no longer saves state to local storage directly
function handleGameStateUpdate(gameState: GameState) {
    // Update global gameId and myPlayerId references from NetworkManager
    gameId = networkManager.getGameId(); // Exposed as public on NetworkManager
    myPlayerId = networkManager.getMyPlayerId();

    renderGame(gameState); // Render UI for this tab
    // The NetworkManager now handles broadcasting to other tabs
}

function updateModals(gameState: GameState, myPlayerId: string | null) {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const myPlayer = myPlayerId ? findPlayerById(gameState, myPlayerId) : undefined;

    const isActionModalOpen = actionModal?.classList.contains('show');
    const isWinModalOpen = winModal?.classList.contains('show');
    const isLogModalOpen = logModal?.classList.contains('show');

    // Rule: Always hide action modal if game is over or if it's not my turn/my expected response
    // This is the cleanup step for modals that are no longer relevant.
    if (gameState.gameEnded || gameState.gameStatus === "GAME_OVER" || (myPlayer && myPlayer.id !== currentPlayer.id &&
        // Exceptions where a non-current player needs a modal:
        !(gameState.gamePhase === "AWAIT_JSN_RESPONSE" && myPlayer.id !== gameState.actionContext.pendingAction?.sourcePlayerId) && // Awaiting JSN response from anyone but source
        !(gameState.gamePhase === "AWAIT_PAYMENT" && myPlayer.id === gameState.actionContext.owingPlayerId) // Awaiting payment from the owing player
    )) {
        if (isActionModalOpen) hideActionModal();
    }

    // Win Modal (Highest priority)
    if (gameState.gameEnded) {
        if (!isWinModalOpen) { // Only show if not already showing
            const winner = findPlayerById(gameState, gameState.winnerId || '');
            if (winModalTitle) winModalTitle.textContent = "Game Over!";
            if (winModalMessage) winModalMessage.textContent = `${winner?.name || 'A player'} has won the game!`;
            winModal?.classList.add('show');
        }
        return; // Stop processing other modals
    } else {
        if (isWinModalOpen) winModal?.classList.remove('show'); // Hide if game is no longer ended
    }
    
    // --- Specific Modal Logic driven by GameState ---

    // DISCARD_PHASE Modal
    if (gameState.gamePhase === "DISCARD_PHASE" && myPlayer && myPlayer.hand.length > 7 && myPlayer.id === currentPlayer.id) {
        if (!isActionModalOpen || actionModalTitle?.textContent !== 'Discard Cards') { // Only open if not already open for discard
            const numToDiscard = myPlayer.hand.length - 7;
            const message = `${myPlayer.name}, you must discard ${numToDiscard} card(s) down to 7.`;
            
            const discardOptions: ModalOption[] = myPlayer.hand.map((card: Card) => ({ 
                id: card.id, 
                label: card.name, 
                type: 'card', 
                card: card 
            }));

            showActionModal(
                `Discard Cards`,
                message,
                discardOptions,
                (selectionId: string | null, selectedOption?: ModalOption) => {
                    if (selectionId && selectedOption && selectedOption.card) {
                        networkManager.sendPlayerAction("DISCARD_CARD", { cardId: selectedOption.card.id });
                    } else if (selectionId === 'cancel') { // User clicked cancel on the modal (not selecting a card)
                        clearSelection(); // Clear visual selection in hand
                        // User cancelled the modal, but still needs to discard. Modal will reappear.
                    }
                },
                true // Enable confirm selection
            );
        }
        return; // Stop processing other modals
    } else if (isActionModalOpen && actionModalTitle?.textContent === 'Discard Cards') {
        hideActionModal(); // Hide if no longer in discard phase or hand size is fine
    }


    // AWAIT_PAYMENT Modal
    if (gameState.gamePhase === "AWAIT_PAYMENT" && myPlayer && myPlayer.id === gameState.actionContext.owingPlayerId) {
        if (!isActionModalOpen || actionModalTitle?.textContent !== 'Pay Debt!') { // Only open if not already open for payment
            const context = gameState.actionContext;
            const recipient = findPlayerById(gameState, context.requestingPlayerId || '');
            const playerOwes = myPlayer.owedAmount;

            let options: ModalOption[] = [];
            myPlayer.bank.forEach((card: Card) => options.push({ id: `bank-${card.id}`, label: card.name, type: 'card', card: card }));
            for (const color in myPlayer.properties) {
                if (!isSetComplete(myPlayer, color)) { // Cannot pay with cards from complete sets
                    myPlayer.properties[color].forEach((card: Card) => options.push({ id: `prop-${card.id}`, label: card.name, type: 'card', card: card }));
                }
            }

            // Initial message
            const initialMessage = `${myPlayer.name}, you owe ${recipient?.name || 'someone'} ${playerOwes}M. Select cards to pay. (Current paid: 0M)`;

            showActionModal(`Pay Debt!`,
                initialMessage,
                options,
                (selectionId: string | null, selectedOption?: ModalOption) => {
                    if (selectionId === 'confirm') {
                        const selectedCardsForPayment = Array.from(actionModalOptions?.querySelectorAll('.modal-option-card.selected') || []).map((el: Element) => {
                            const cardId = (el as HTMLElement).dataset.optionId?.split('-')[1];
                            return myPlayer ? findCardInPlayersAssets(myPlayer, cardId || '')?.id : undefined;
                        }).filter((id): id is string => !!id);

                        // Calculate total paid here again for client-side validation before sending
                        let currentPaid = 0;
                        for(const cardId of selectedCardsForPayment) {
                            const card = myPlayer ? findCardInPlayersAssets(myPlayer, cardId) : undefined;
                            if (card) currentPaid += card.bankValue;
                        }

                        if (currentPaid < playerOwes) {
                            alert(`Insufficient payment! You owe ${playerOwes}M but selected cards worth ${currentPaid}M. Please select more cards.`);
                            // Do NOT hide modal, do NOT send action. User must correct.
                            return;
                        }

                        networkManager.sendPlayerAction("PAY_DEBT", { cardsToPayIds: selectedCardsForPayment });
                    } else if (selectionId === 'cancel') { // User chose to cancel payment
                         // If a player cancels, send an empty payment array. The engine will handle what happens next (e.g., auto-taking assets).
                        networkManager.sendPlayerAction("PAY_DEBT", { cardsToPayIds: [] });
                    }
                    hideActionModal(); // Hide modal after valid action or refusal
                },
                true
            );

            // Update message based on selected cards for live feedback
            const updatePaidAmount = () => {
                const selectedCardElements = Array.from(actionModalOptions?.querySelectorAll('.modal-option-card.selected') || []) as HTMLElement[];
                let currentPaid = 0;
                for(const el of selectedCardElements) {
                    const cardId = el.dataset.optionId?.split('-')[1];
                    const card = myPlayer ? findCardInPlayersAssets(myPlayer, cardId || '') : undefined; // Get from live player object
                    if (card) currentPaid += card.bankValue;
                }
                if (actionModalMessage) actionModalMessage.textContent = `${myPlayer.name}, you owe ${recipient?.name || 'someone'} ${playerOwes}M. Selected to pay: ${currentPaid}M.`;
            };
            if (actionModalOptions) {
                actionModalOptions.removeEventListener('click', updatePaidAmount); // Prevent duplicate listeners
                actionModalOptions.addEventListener('click', updatePaidAmount);
            }
            updatePaidAmount(); // Initial update
        }
        return; // Stop processing other modals
    } else if (isActionModalOpen && actionModalTitle?.textContent === 'Pay Debt!') {
        hideActionModal(); // Hide if no longer in payment phase or not my debt
    }


    // AWAIT_JSN_RESPONSE Modal
    if (gameState.gamePhase === "AWAIT_JSN_RESPONSE" && myPlayer && myPlayer.id !== gameState.actionContext.pendingAction?.sourcePlayerId) {
        if (!isActionModalOpen || (actionModalTitle?.textContent !== 'Just Say No! Opportunity' && actionModalTitle?.textContent !== 'Action in Progress')) {
            const actingPlayer = findPlayerById(gameState, gameState.actionContext.pendingAction?.sourcePlayerId || '');
            const targetPlayer = findPlayerById(gameState, gameState.actionContext.pendingAction?.targetPlayerId || '');
            const actionName = gameState.actionContext.pendingAction?.actionCard.name;

            const canPlayJSN = myPlayer.hand.some((c: Card) => c.cardDefId === "ACTION_JUST_SAY_NO");

            if (canPlayJSN) {
                const jsnCards = myPlayer.hand.filter((c: Card) => c.cardDefId === "ACTION_JUST_SAY_NO");
                let options: ModalOption[] = jsnCards.map((c: Card) => ({ id: c.id, label: c.name, type: 'card', card: c }));

                showActionModal(
                    `Just Say No! Opportunity`,
                    `${actingPlayer?.name || 'A player'} just played ${actionName} targeting ${targetPlayer?.name || 'someone'}. Do you (${myPlayer.name}) want to play a Just Say No!?`,
                    options,
                    (selectionId: string | null, selectedOption?: ModalOption) => {
                        if (selectionId && selectedOption && selectedOption.card) {
                            networkManager.sendPlayerAction("JUST_SAY_NO_RESPONSE", {
                                responseType: "YES",
                                justSayNoCardId: selectedOption.card.id
                            });
                        } else if (selectionId === 'cancel') {
                            networkManager.sendPlayerAction("JUST_SAY_NO_RESPONSE", {
                                responseType: "NO",
                                justSayNoCardId: null
                            });
                        }
                    },
                    true,
                    'default' // Allow selecting a card, not confirm-only
                );
                actionModalConfirmBtn!.textContent = "Play JSN";
                actionModalCancelBtn!.textContent = "Decline";
            } else {
                showActionModal(
                    `Action in Progress`,
                    `${actingPlayer?.name || 'A player'} just played ${actionName} targeting ${targetPlayer?.name || 'someone'}. ${myPlayer.name}, you do not have a Just Say No! card.`,
                    [], // No options to select JSN
                    (selectionId: string | null) => { 
                         networkManager.sendPlayerAction("JUST_SAY_NO_RESPONSE", {
                            responseType: "NO",
                            justSayNoCardId: null
                        });
                        hideActionModal(); // Hide after acknowledging
                    },
                    false,
                    'confirm-only' // Shows only confirm button
                );
                actionModalConfirmBtn!.classList.add('hidden'); // Hide "Confirm" since there's nothing to confirm
                actionModalCancelBtn!.textContent = "Acknowledge";
            }
        }
        return; // Stop processing other modals
    } else if (isActionModalOpen && (actionModalTitle?.textContent === 'Just Say No! Opportunity' || actionModalTitle?.textContent === 'Action in Progress')) {
        hideActionModal(); // Hide if no longer in JSN phase or not targetable
    }


    // AWAIT_TARGET Modal (This phase does NOT directly open a modal, but enables clickable elements in `renderGame`)
    // Specific clickable elements (opponent panels, own property sets/cards) will open the `actionModal`.
    // This `updateModals` block simply ensures the modal is hidden if the phase changes or it's not the current player.
    if (gameState.gamePhase === "AWAIT_TARGET" && myPlayer && myPlayer.id === currentPlayer.id) {
        const context = gameState.actionContext;
        // If an AWAIT_TARGET modal is currently open, and it corresponds to the current action context, keep it open.
        // This is important for multi-step modals (like selecting a property *after* selecting an opponent).
        if (isActionModalOpen && actionModalTitle?.textContent === (context.actionDef?.name || "Select Target")) {
             // Keep modal open. Its internal onConfirm callback will send SELECT_TARGET.
        } else {
            // If AWAIT_TARGET is active, but no relevant modal is showing, it means the UI is expecting a click
            // on an opponent, or on one of your properties/sets.
            // No explicit `showActionModal` here to start a new AWAIT_TARGET modal unless specific logic is added for that.
            // console.log("AWAIT_TARGET active, no modal for it. Waiting for user click on opponent or property.");
        }
        return; // Don't hide the modal prematurely if it's awaiting target
    } else if (isActionModalOpen && actionModalTitle?.textContent === (gameState.actionContext.actionDef?.name || "Select Target")) {
        // Hide if no longer in AWAIT_TARGET phase or not my turn for targeting.
        hideActionModal();
    }
}


// --- Game Initialization & Event Listeners ---
// Helper function to find active game IDs in localStorage
function getActiveGameIds(): string[] {
    const gameIds: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('monopolyDealGame_')) {
            gameIds.push(key.substring('monopolyDealGame_'.length));
        }
    }
    return [...new Set(gameIds)].sort();
}


document.addEventListener('DOMContentLoaded', async () => {
    let gameIdToUse: string | null = null;
    let myPlayerIdToUse: string | null = sessionStorage.getItem('myPlayerId'); 

    gameIdToUse = sessionStorage.getItem('gameId');

    if (!gameIdToUse) { 
        const existingGames = getActiveGameIds();
        let choice: string | null;

        if (existingGames.length > 0) {
            choice = prompt(
                `Active games found: ${existingGames.join(', ')}\n\n` +
                `Enter an EXISTING Game ID to JOIN, or a NEW ID to CREATE a game:`,
                existingGames[0] || "defaultGame" 
            );
        } else {
            choice = prompt("No active games found. Enter a NEW Game ID to create a game:", "defaultGame");
        }

        if (!choice || choice.trim() === "") {
            alert("Game ID is required. Reloading.");
            window.location.reload();
            return;
        }
        gameIdToUse = choice.trim();
        sessionStorage.setItem('gameId', gameIdToUse);
    }

    gameId = gameIdToUse; // Set global gameId for main.ts reference

    // Instantiate NetworkManager
    networkManager = new NetworkManager(gameIdToUse);

    // Register UI update callback
    networkManager.onGameStateUpdate(handleGameStateUpdate);

    // Initialize the NetworkManager (this handles host/client and game state loading)
    await networkManager.init();

    // Initial render based on the state after init
    const initialGameState = networkManager.getGameState();
    if (initialGameState) {
        handleGameStateUpdate(initialGameState);
    } else {
        console.error("Failed to initialize game state from NetworkManager.");
        // Potentially show a full-page error here
    }

});

// Event listeners for game actions - only enabled if it's my player's turn/action
endTurnBtn?.addEventListener('click', () => {
    const gameState = networkManager.getGameState();
    if (!gameState) return;
    const myCurrentPlayerId = networkManager.getMyPlayerId();

    if (myCurrentPlayerId && gameState.players[gameState.currentPlayerIndex].id === myCurrentPlayerId && gameState.gamePhase === "MAIN_PLAY_PHASE") {
        networkManager.sendPlayerAction("END_TURN", {});
    } else {
        console.warn("Cannot end turn: not your turn or not in correct phase.");
    }
});

showLogBtn?.addEventListener('click', () => {
    const gameState = networkManager.getGameState();
    if (!gameState) return;
    if (logEntries) {
        logEntries.innerHTML = '';
        gameState.gameLog.forEach((entry: string) => {
            const p = document.createElement('p');
            p.textContent = entry;
            logEntries.appendChild(p);
        });
        logEntries.scrollTop = logEntries.scrollHeight;
    }
    logModal?.classList.add('show');
});

logModalCloseBtn?.addEventListener('click', () => {
    logModal?.classList.remove('show');
});
winModalRestartBtn?.addEventListener('click', () => {
    if (gameId) {
        localStorage.removeItem(`monopolyDealGame_${gameId}`); 
        sessionStorage.clear(); 
    }
    window.location.reload(); 
});
winModalCloseBtn?.addEventListener('click', () => {
    winModal?.classList.remove('show');
});


// Add below your existing event listeners

function canEndTurn(player: Player): boolean {
    // Players can always end turn early unless they need to discard
    return !actionInProgress;
}

function onEndTurnClick() {
    if (!canEndTurn(currentPlayer)) return;
    if (currentPlayer.hand.length > 7) {
        openDiscardModal(currentPlayer.hand);
    } else {
        endPlayerTurn();
    }
}

// Allow player to discard selectively
function openDiscardModal(hand: Card[]) {
    const discardModal = document.createElement('div');
    discardModal.classList.add('modal', 'show');
    discardModal.innerHTML = \`
        <div class="modal-content">
            <h2>Discard Cards</h2>
            <p>Select \${hand.length - 7} cards to discard.</p>
            <div id="discard-options" class="scrollable-content"></div>
            <button id="confirm-discard-btn">Confirm Discard</button>
        </div>
    \`;

    document.body.appendChild(discardModal);
    const optionsContainer = discardModal.querySelector('#discard-options')!;
    const selectedCards: Set<string> = new Set();

    hand.forEach(card => {
        const div = document.createElement('div');
        div.classList.add('modal-option-card');
        div.innerText = card.name;
        div.onclick = () => {
            if (selectedCards.has(card.id)) {
                selectedCards.delete(card.id);
                div.classList.remove('selected');
            } else {
                selectedCards.add(card.id);
                div.classList.add('selected');
            }
        };
        optionsContainer.appendChild(div);
    });

    const confirmBtn = discardModal.querySelector('#confirm-discard-btn')!;
    confirmBtn.addEventListener('click', () => {
        if (selectedCards.size !== hand.length - 7) {
            alert(\`Select exactly \${hand.length - 7} cards.\`);
            return;
        }
        selectedCards.forEach(cardId => {
            const card = hand.find(c => c.id === cardId);
            if (card) discardCard(card);
        });
        discardModal.remove();
        endPlayerTurn();
    });
}
