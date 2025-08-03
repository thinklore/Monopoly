// ====================================================================
// Monopoly Deal Digital Version (v2 - Complete) - Game Engine (TypeScript - Multi-Tab Ready)
// ====================================================================

// --- 0. Type Definitions (Interfaces and Discriminated Unions) ---

interface BaseCardDetails {}

export interface MoneyCardDetails extends BaseCardDetails {}
export interface ActionCardDetails extends BaseCardDetails {
    actionType: "STEAL_SET" | "STEAL_PROPERTY" | "SWAP_PROPERTY" | "COLLECT_FROM_PLAYER" | "COLLECT_FROM_ALL" | "DRAW_TWO" | "NEGATE_ACTION" | "ADD_HOUSE" | "ADD_HOTEL" | "DOUBLE_RENT";
}
export interface PropertyCardDetails extends BaseCardDetails {
    color: string;
    rent: number[];
    setSize: number;
}
export interface PropertyWildcardDetails extends BaseCardDetails {
    colors: string[];
}
export interface RentCardDetails extends BaseCardDetails {
    colors: string[];
}

export type Card = {
    id: string;
    cardDefId: string;
    name: string;
    bankValue: number;
    assignedColor?: string | null;
} & (
    | { type: "Money"; details: MoneyCardDetails }
    | { type: "Action"; details: ActionCardDetails }
    | { type: "Property"; details: PropertyCardDetails }
    | { type: "PropertyWildcard"; details: PropertyWildcardDetails }
    | { type: "Rent"; details: RentCardDetails }
);


export interface Player {
    id: string;
    name: string;
    hand: Card[];
    bank: Card[];
    properties: {
        [color: string]: Card[];
    };
    housesAndHotels: { [color: string]: number };
    owedAmount: number;
    owedToPlayerId: string | null;
    isReady: boolean; // <-- NEW: Player ready status
}

export interface ActionContext {
    type?: string;
    cardId?: string;
    // FIX START: Add 'name' to actionDef
    actionDef?: { actionType: string; name: string }; 
    // FIX END
    sourcePlayerId?: string;
    targetPlayerId?: string;
    targetPropertyId?: string | null;
    chosenColor?: string | null;
    amount?: number;
    promptMessage?: string;
    doubleRentActive?: boolean;
    doubleRentSourceCardId?: string;
    sourcePropertyId?: string | null;

    pendingAction?: {
        type: string;
        sourcePlayerId: string;
        targetPlayerId: string;
        targetPropertyId?: string | null;
        chosenColor?: string | null;
        actionCard: Card;
    };
    justSayNoStack?: { playerId: string; cardId: string }[];
    jsnPendingPlayerIndex?: number;
    requiredTarget?: string;
    owingPlayerId?: string;
    requestingPlayerId?: string;
}

export interface GameState {
    players: Player[];
    deck: Card[];
    discardPile: Card[];
    currentPlayerIndex: number;
    gamePhase: "DRAW_PHASE" | "MAIN_PLAY_PHASE" | "DISCARD_PHASE" | "AWAIT_TARGET" | "AWAIT_PAYMENT" | "AWAIT_JSN_RESPONSE" | "GAME_OVER";
    gameStatus: "LOBBY" | "IN_GAME" | "GAME_OVER"; // <-- NEW: Overall game status
    playsRemaining: number;
    gameLog: string[];
    actionContext: ActionContext;
    gameEnded: boolean;
    winnerId: string | null;
    expectedPlayerCount: number; // <-- NEW: For the lobby
}


// --- 1. CARD_DEFINITIONS Constant ---
export const CARD_DEFINITIONS = {
    "M_1M": { name: "1 Million", type: "Money" as const, bankValue: 1 },
    "M_2M": { name: "2 Million", type: "Money" as const, bankValue: 2 },
    "M_3M": { name: "3 Million", type: "Money" as const, bankValue: 3 },
    "M_4M": { name: "4 Million", type: "Money" as const, bankValue: 4 },
    "M_5M": { name: "5 Million", type: "Money" as const, bankValue: 5 },
    "M_10M": { name: "10 Million", type: "Money" as const, bankValue: 10 },

    "ACTION_DEAL_BREAKER": { name: "Deal Breaker", type: "Action" as const, bankValue: 5, actionType: "STEAL_SET" as const },
    "ACTION_SLY_DEAL": { name: "Sly Deal", type: "Action" as const, bankValue: 3, actionType: "STEAL_PROPERTY" as const },
    "ACTION_FORCED_DEAL": { name: "Forced Deal", type: "Action" as const, bankValue: 3, actionType: "SWAP_PROPERTY" as const },
    "ACTION_DEBT_COLLECTOR": { name: "Debt Collector", type: "Action" as const, bankValue: 3, actionType: "COLLECT_FROM_PLAYER" as const },
    "ACTION_ITS_MY_BIRTHDAY": { name: "It's My Birthday", type: "Action" as const, bankValue: 2, actionType: "COLLECT_FROM_ALL" as const },
    "ACTION_PASS_GO": { name: "Pass Go", type: "Action" as const, bankValue: 1, actionType: "DRAW_TWO" as const },
    "ACTION_JUST_SAY_NO": { name: "Just Say No!", type: "Action" as const, bankValue: 4, actionType: "NEGATE_ACTION" as const },
    "ACTION_HOUSE": { name: "House", type: "Action" as const, bankValue: 3, actionType: "ADD_HOUSE" as const },
    "ACTION_HOTEL": { name: "Hotel", type: "Action" as const, bankValue: 4, actionType: "ADD_HOTEL" as const },
    "ACTION_DOUBLE_THE_RENT": { name: "Double The Rent", type: "Action" as const, bankValue: 1, actionType: "DOUBLE_RENT" as const },

    "PROP_MEDITERRANEAN_AVE": { name: "Mediterranean Avenue", type: "Property" as const, color: "Brown", bankValue: 1, rent: [1, 2, 4], setSize: 2 },
    "PROP_BALTIC_AVE": { name: "Baltic Avenue", type: "Property" as const, color: "Brown", bankValue: 1, rent: [1, 2, 4], setSize: 2 },
    "PROP_ORIENTAL_AVE": { name: "Oriental Avenue", type: "Property" as const, color: "Light Blue", bankValue: 1, rent: [1, 2, 3], setSize: 3 },
    "PROP_VERMONT_AVE": { name: "Vermont Avenue", type: "Property" as const, color: "Light Blue", bankValue: 1, rent: [1, 2, 3], setSize: 3 },
    "PROP_CONNECTICUT_AVE": { name: "Connecticut Avenue", type: "Property" as const, color: "Light Blue", bankValue: 1, rent: [1, 2, 3], setSize: 3 },
    "PROP_ST_CHARLES_PLACE": { name: "St. Charles Place", type: "Property" as const, color: "Pink", bankValue: 2, rent: [1, 2, 4], setSize: 3 },
    "PROP_STATES_AVE": { name: "States Avenue", type: "Property" as const, color: "Pink", bankValue: 2, rent: [1, 2, 4], setSize: 3 },
    "PROP_VIRGINIA_AVE": { name: "Virginia Avenue", type: "Property" as const, color: "Pink", bankValue: 2, rent: [1, 2, 4], setSize: 3 },
    "PROP_ST_JAMES_PLACE": { name: "St. James Place", type: "Property" as const, color: "Orange", bankValue: 2, rent: [1, 2, 4], setSize: 3 },
    "PROP_TENNESSEE_AVE": { name: "Tennessee Avenue", type: "Property" as const, color: "Orange", bankValue: 2, rent: [1, 2, 4], setSize: 3 },
    "PROP_NEW_YORK_AVE": { name: "New York Avenue", type: "Property" as const, color: "Orange", bankValue: 2, rent: [1, 2, 4], setSize: 3 },
    "PROP_KENTUCKY_AVE": { name: "Kentucky Avenue", type: "Property" as const, color: "Red", bankValue: 3, rent: [2, 3, 6], setSize: 3 },
    "PROP_INDIANA_AVE": { name: "Indiana Avenue", type: "Property" as const, color: "Red", bankValue: 3, rent: [2, 3, 6], setSize: 3 },
    "PROP_ILLINOIS_AVE": { name: "Illinois Avenue", type: "Property" as const, color: "Red", bankValue: 3, rent: [2, 3, 6], setSize: 3 },
    "PROP_ATLANTIC_AVE": { name: "Atlantic Avenue", type: "Property" as const, color: "Yellow", bankValue: 3, rent: [2, 4, 7], setSize: 3 },
    "PROP_VENTNOR_AVE": { name: "Ventnor Avenue", type: "Property" as const, color: "Yellow", bankValue: 3, rent: [2, 4, 7], setSize: 3 },
    "PROP_MARVIN_GARDENS": { name: "Marvin Gardens", type: "Property" as const, color: "Yellow", bankValue: 3, rent: [2, 4, 7], setSize: 3 },
    "PROP_PACIFIC_AVE": { name: "Pacific Avenue", type: "Property" as const, color: "Green", bankValue: 4, rent: [2, 5, 8], setSize: 3 },
    "PROP_NORTH_CAROLINA_AVE": { name: "North Carolina Avenue", type: "Property" as const, color: "Green", bankValue: 4, rent: [2, 5, 8], setSize: 3 },
    "PROP_PENNSYLVANIA_AVE": { name: "Pennsylvania Avenue", type: "Property" as const, color: "Green", bankValue: 4, rent: [2, 5, 8], setSize: 3 },
    "PROP_PARK_PLACE": { name: "Park Place", type: "Property" as const, color: "Dark Blue", bankValue: 4, rent: [3, 8], setSize: 2 },
    "PROP_BOARDWALK": { name: "Boardwalk", type: "Property" as const, color: "Dark Blue", bankValue: 4, rent: [3, 8], setSize: 2 },
    "PROP_READING_RR": { name: "Reading Railroad", type: "Property" as const, color: "Railroad", bankValue: 2, rent: [1, 2, 3, 4], setSize: 4 },
    "PROP_PENNSYLVANIA_RR": { name: "Pennsylvania Railroad", type: "Property" as const, color: "Railroad", bankValue: 2, rent: [1, 2, 3, 4], setSize: 4 },
    "PROP_B_O_RR": { name: "B&O Railroad", type: "Property" as const, color: "Railroad", bankValue: 2, rent: [1, 2, 3, 4], setSize: 4 },
    "PROP_SHORT_LINE_RR": { name: "Short Line", type: "Property" as const, color: "Railroad", bankValue: 2, rent: [1, 2, 3, 4], setSize: 4 },
    "PROP_ELECTRIC_COMPANY": { name: "Electric Company", type: "Property" as const, color: "Utility", bankValue: 1, rent: [1, 2], setSize: 2 },
    "PROP_WATER_WORKS": { name: "Water Works", type: "Property" as const, color: "Utility", bankValue: 1, rent: [1, 2], setSize: 2 },

    "PW_PINK_ORANGE": { name: "Property Wildcard (Pink/Orange)", type: "PropertyWildcard" as const, bankValue: 2, colors: ["Pink", "Orange"] },
    "PW_RED_YELLOW": { name: "Property Wildcard (Red/Yellow)", type: "PropertyWildcard" as const, bankValue: 3, colors: ["Red", "Yellow"] },
    "PW_LIGHTBLUE_BROWN": { name: "Property Wildcard (Light Blue/Brown)", type: "PropertyWildcard" as const, bankValue: 1, colors: ["Light Blue", "Brown"] },
    "PW_DARKBLUE_GREEN": { name: "Property Wildcard (Dark Blue/Green)", type: "PropertyWildcard" as const, bankValue: 4, colors: ["Dark Blue", "Green"] },
    "PW_GREEN_RAILROAD": { name: "Property Wildcard (Green/Railroad)", type: "PropertyWildcard" as const, bankValue: 4, colors: ["Green", "Railroad"] },
    "PW_LIGHTBLUE_RAILROAD": { name: "Property Wildcard (Light Blue/Railroad)", type: "PropertyWildcard" as const, bankValue: 4, colors: ["Light Blue", "Railroad"] },
    "PW_UTILITIES_RAILROAD": { name: "Property Wildcard (Utilities/Railroad)", type: "PropertyWildcard" as const, bankValue: 2, colors: ["Utility", "Railroad"] },
    "PW_RAINBOW_ANY": { name: "Property Wildcard (Rainbow)", type: "PropertyWildcard" as const, bankValue: 0, colors: ["Any"] },

    "RENT_RAINBOW_ANY": { name: "Rent (Rainbow)", type: "Rent" as const, bankValue: 3, colors: ["Any"] },
    "RENT_PINK_ORANGE": { name: "Rent (Pink/Orange)", type: "Rent" as const, bankValue: 1, colors: ["Pink", "Orange"] },
    "RENT_RED_YELLOW": { name: "Rent (Red/Yellow)", type: "Rent" as const, bankValue: 1, colors: ["Red", "Yellow"] },
    "RENT_GREEN_DARKBLUE": { name: "Rent (Green/Dark Blue)", type: "Rent" as const, bankValue: 1, colors: ["Green", "Dark Blue"] },
    "RENT_LIGHTBLUE_BROWN": { name: "Rent (Light Blue/Brown)", type: "Rent" as const, bankValue: 1, colors: ["Light Blue", "Brown"] },
    "RENT_RAILROAD_UTILITY": { name: "Rent (Railroad/Utility)", type: "Rent" as const, bankValue: 1, colors: ["Railroad", "Utility"] },
};

export const PROPERTY_SET_SIZES: { [key: string]: number } = {
    "Brown": 2, "Light Blue": 3, "Pink": 3, "Orange": 3,
    "Red": 3, "Yellow": 3, "Green": 3, "Dark Blue": 2,
    "Railroad": 4, "Utility": 2
};


// --- 2. Helper Functions ---

export function shuffle<T>(array: T[]): T[] {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

export function drawCards(numCardsToDraw: number, currentDeck: Card[], currentDiscardPile: Card[], gameLog: string[]): { drawn: Card[], updatedDeck: Card[], updatedDiscardPile: Card[] } {
    const drawnCards: Card[] = [];
    let deckToUse = [...currentDeck];
    let discardToUse = [...currentDiscardPile];

    for (let i = 0; i < numCardsToDraw; i++) {
        if (deckToUse.length === 0) {
            if (discardToUse.length > 0) {
                deckToUse = shuffle(discardToUse);
                discardToUse = [];
                gameLog.push("Deck reshuffled from discard pile.");
            } else {
                break;
            }
        }

        if (deckToUse.length > 0) {
            const card = deckToUse.shift();
            if (card) {
                drawnCards.push(card);
            }
        } else {
            break;
        }
    }

    return { drawn: drawnCards, updatedDeck: deckToUse, updatedDiscardPile: discardToUse };
}

export function findPlayerById(gameState: GameState, playerId: string): Player | undefined {
    return gameState.players.find((player: Player) => player.id === playerId);
}

export function calculatePlayerBankValue(player: Player): number {
    return player.bank.reduce((sum: number, card: Card) => sum + card.bankValue, 0);
}

export function calculatePlayerPropertyValue(player: Player): number {
    let totalValue = 0;
    for (const color in player.properties) {
        player.properties[color].forEach((card: Card) => {
            totalValue += card.bankValue;
        });
    }
    return totalValue;
}

export function isSetComplete(player: Player, color: string): boolean {
    const propertiesInSet = player.properties[color];
    if (!propertiesInSet || propertiesInSet.length === 0) {
        return false;
    }
    const requiredSize = PROPERTY_SET_SIZES[color];
    return propertiesInSet.length === requiredSize;
}

export function getNumberOfCompleteSets(player: Player): number {
    let completeSets = 0;
    for (const color in player.properties) {
        if (isSetComplete(player, color)) {
            completeSets++;
        }
    }
    return completeSets;
}

export function checkWinCondition(gameState: GameState): GameState {
    for (const player of gameState.players) {
        if (getNumberOfCompleteSets(player) >= 3) {
            gameState.gameEnded = true;
            gameState.winnerId = player.id;
            gameState.gamePhase = "GAME_OVER";
            gameState.gameLog.push(`${player.name} has won the game by completing 3 property sets!`);
            return gameState;
        }
    }
    return gameState;
}

export function findCardInPlayersAssets(player: Player, cardId: string): Card | undefined {
    let card = player.hand.find((c: Card) => c.id === cardId);
    if (card) return card;
    card = player.bank.find((c: Card) => c.id === cardId);
    if (card) return card;
    for (const color in player.properties) {
        card = player.properties[color].find((c: Card) => c.id === cardId);
        if (card) return card;
    }
    return undefined;
}

export function removeCardFromPlayersAssets(player: Player, cardId: string): boolean {
    const handIndex = player.hand.findIndex((c: Card) => c.id === cardId);
    if (handIndex !== -1) {
        player.hand.splice(handIndex, 1);
        return true;
    }

    const bankIndex = player.bank.findIndex((c: Card) => c.id === cardId);
    if (bankIndex !== -1) {
        player.bank.splice(bankIndex, 1);
        return true;
    }

    for (const color in player.properties) {
        const propIndex = player.properties[color].findIndex((c: Card) => c.id === cardId);
        if (propIndex !== -1) {
            player.properties[color].splice(propIndex, 1);
            if (player.properties[color].length === 0) {
                delete player.properties[color];
            }
            return true;
        }
    }
    return false;
}

export function addCardToPlayerProperties(player: Player, card: Card): void {
    let targetColor: string | undefined;

    if (card.type === "PropertyWildcard" && card.assignedColor) {
        targetColor = card.assignedColor;
    } else if (card.type === "Property") {
        targetColor = (card.details as PropertyCardDetails).color;
    }

    if (!targetColor) {
        console.error("Attempted to add non-property card or unassigned wildcard without a target color to properties.");
        return;
    }

    if (!player.properties[targetColor]) {
        player.properties[targetColor] = [];
    }
    player.properties[targetColor].push(card);
}


// --- 3. Main Game Engine Functions ---

export class MonopolyDealEngine {
    private gameState: GameState;

    constructor(initialState?: GameState) { // <-- MODIFIED: No longer takes playerNames directly here
        if (initialState) {
            this.gameState = initialState;
        } else {
            // This is the initial creation by the first host
            this.gameState = this.initializeLobbyState(); // <-- NEW: Initialize lobby state
        }
    }

    public getGameState(): Readonly<GameState> {
        return this.gameState;
    }

    // <-- NEW: Initialize the game in a lobby state
    private initializeLobbyState(): GameState {
        // We will prompt for expectedPlayerCount in NetworkManager, not here.
        // For now, create a default state that will be updated by NetworkManager.
        return {
            players: [], // Players will be added as they join through NetworkManager
            deck: [],
            discardPile: [],
            currentPlayerIndex: 0,
            gamePhase: "DRAW_PHASE", // This will be set to IN_GAME when game starts
            gameStatus: "LOBBY", // <-- NEW: Game starts in LOBBY status
            playsRemaining: 0,
            gameLog: ["Welcome to Monopoly Deal! Waiting for players to join..."],
            actionContext: {},
            gameEnded: false,
            winnerId: null,
            expectedPlayerCount: 0, // Will be set by host via NetworkManager
        };
    }

// <-- NEW: Method to prepare the game (deal cards, set initial phase) once all players are ready
public prepareGameForStart(playerNames: string[]): GameState {
    if (this.gameState.gameStatus !== "LOBBY") {
        this.gameState.gameLog.push("ERROR: Cannot start game, not in lobby phase.");
        return this.gameState;
    }

    let deck: Card[] = [];
    let cardInstanceCounter = 0;

    // Populate deck with all 106 cards (same as your original initializeGame)
    for (let i = 0; i < 6; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "M_1M", name: "1 Million", type: "Money", bankValue: 1, details: {} });
    for (let i = 0; i < 5; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "M_2M", name: "2 Million", type: "Money", bankValue: 2, details: {} });
    for (let i = 0; i < 3; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "M_3M", name: "3 Million", type: "Money", bankValue: 3, details: {} });
    for (let i = 0; i < 3; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "M_4M", name: "4 Million", type: "Money", bankValue: 4, details: {} });
    for (let i = 0; i < 2; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "M_5M", name: "5 Million", type: "Money", bankValue: 5, details: {} });
    for (let i = 0; i < 1; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "M_10M", name: "10 Million", type: "Money", bankValue: 10, details: {} });

    for (let i = 0; i < 2; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "ACTION_DEAL_BREAKER", name: "Deal Breaker", type: "Action", bankValue: 5, details: { actionType: "STEAL_SET" } });
    for (let i = 0; i < 3; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "ACTION_SLY_DEAL", name: "Sly Deal", type: "Action", bankValue: 3, details: { actionType: "STEAL_PROPERTY" } });
    for (let i = 0; i < 3; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "ACTION_FORCED_DEAL", name: "Forced Deal", type: "Action", bankValue: 3, details: { actionType: "SWAP_PROPERTY" } });
    for (let i = 0; i < 3; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "ACTION_DEBT_COLLECTOR", name: "Debt Collector", type: "Action", bankValue: 3, details: { actionType: "COLLECT_FROM_PLAYER" } });
    for (let i = 0; i < 3; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "ACTION_ITS_MY_BIRTHDAY", name: "It's My Birthday", type: "Action", bankValue: 2, details: { actionType: "COLLECT_FROM_ALL" } });
    for (let i = 0; i < 10; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "ACTION_PASS_GO", name: "Pass Go", type: "Action", bankValue: 1, details: { actionType: "DRAW_TWO" } });
    for (let i = 0; i < 3; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "ACTION_JUST_SAY_NO", name: "Just Say No!", type: "Action", bankValue: 4, details: { actionType: "NEGATE_ACTION" } });
    for (let i = 0; i < 3; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "ACTION_HOUSE", name: "House", type: "Action", bankValue: 3, details: { actionType: "ADD_HOUSE" } });
    for (let i = 0; i < 2; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "ACTION_HOTEL", name: "Hotel", type: "Action", bankValue: 4, details: { actionType: "ADD_HOTEL" } });
    for (let i = 0; i < 2; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "ACTION_DOUBLE_THE_RENT", name: "Double The Rent", type: "Action", bankValue: 1, details: { actionType: "DOUBLE_RENT" } });

    const propertyCardDefIds = [
        "PROP_MEDITERRANEAN_AVE", "PROP_BALTIC_AVE",
        "PROP_ORIENTAL_AVE", "PROP_VERMONT_AVE", "PROP_CONNECTICUT_AVE",
        "PROP_ST_CHARLES_PLACE", "PROP_STATES_AVE", "PROP_VIRGINIA_AVE",
        "PROP_ST_JAMES_PLACE", "PROP_TENNESSEE_AVE", "PROP_NEW_YORK_AVE",
        "PROP_KENTUCKY_AVE", "PROP_INDIANA_AVE", "PROP_ILLINOIS_AVE",
        "PROP_ATLANTIC_AVE", "PROP_VENTNOR_AVE", "PROP_MARVIN_GARDENS",
        "PROP_PACIFIC_AVE", "PROP_NORTH_CAROLINA_AVE", "PROP_PENNSYLVANIA_AVE",
        "PROP_PARK_PLACE", "PROP_BOARDWALK",
        "PROP_READING_RR", "PROP_PENNSYLVANIA_RR", "PROP_B_O_RR", "PROP_SHORT_LINE_RR",
        "PROP_ELECTRIC_COMPANY", "PROP_WATER_WORKS"
    ];
    propertyCardDefIds.forEach((defId: string) => {
        const def = CARD_DEFINITIONS[defId as keyof typeof CARD_DEFINITIONS];
        if (def.type === "Property") {
            deck.push({
                id: "card_" + cardInstanceCounter++,
                cardDefId: defId,
                name: def.name,
                type: "Property",
                bankValue: def.bankValue,
                details: { color: def.color, rent: def.rent, setSize: def.setSize }
            });
        }
    });

    for (let i = 0; i < 2; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "PW_PINK_ORANGE", name: "Property Wildcard (Pink/Orange)", type: "PropertyWildcard", bankValue: 2, details: { colors: ["Pink", "Orange"] }, assignedColor: null });
    for (let i = 0; i < 2; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "PW_RED_YELLOW", name: "Property Wildcard (Red/Yellow)", type: "PropertyWildcard", bankValue: 3, details: { colors: ["Red", "Yellow"] }, assignedColor: null });
    for (let i = 0; i < 1; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "PW_LIGHTBLUE_BROWN", name: "Property Wildcard (Light Blue/Brown)", type: "PropertyWildcard", bankValue: 1, details: { colors: ["Light Blue", "Brown"] }, assignedColor: null });
    for (let i = 0; i < 1; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "PW_DARKBLUE_GREEN", name: "Property Wildcard (Dark Blue/Green)", type: "PropertyWildcard", bankValue: 4, details: { colors: ["Dark Blue", "Green"] }, assignedColor: null });
    for (let i = 0; i < 1; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "PW_GREEN_RAILROAD", name: "Property Wildcard (Green/Railroad)", type: "PropertyWildcard", bankValue: 4, details: { colors: ["Green", "Railroad"] }, assignedColor: null });
    for (let i = 0; i < 1; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "PW_LIGHTBLUE_RAILROAD", name: "Property Wildcard (Light Blue/Railroad)", type: "PropertyWildcard", bankValue: 4, details: { colors: ["Light Blue", "Railroad"] }, assignedColor: null });
    for (let i = 0; i < 1; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "PW_UTILITIES_RAILROAD", name: "Property Wildcard (Utilities/Railroad)", type: "PropertyWildcard", bankValue: 2, details: { colors: ["Utility", "Railroad"] }, assignedColor: null });
    for (let i = 0; i < 2; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "PW_RAINBOW_ANY", name: "Property Wildcard (Rainbow)", type: "PropertyWildcard", bankValue: 0, details: { colors: ["Any"] }, assignedColor: null });

    for (let i = 0; i < 3; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "RENT_RAINBOW_ANY", name: "Rent (Rainbow)", type: "Rent", bankValue: 3, details: { colors: ["Any"] } });
    for (let i = 0; i < 2; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "RENT_PINK_ORANGE", name: "Rent (Pink/Orange)", type: "Rent", bankValue: 1, details: { colors: ["Pink", "Orange"] } });
    for (let i = 0; i < 2; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "RENT_RED_YELLOW", name: "Rent (Red/Yellow)", type: "Rent", bankValue: 1, details: { colors: ["Red", "Yellow"] } });
    for (let i = 0; i < 2; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "RENT_GREEN_DARKBLUE", name: "Rent (Green/Dark Blue)", type: "Rent", bankValue: 1, details: { colors: ["Green", "Dark Blue"] } });
    for (let i = 0; i < 2; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "RENT_LIGHTBLUE_BROWN", name: "Rent (Light Blue/Brown)", type: "Rent", bankValue: 1, details: { colors: ["Light Blue", "Brown"] } });
    for (let i = 0; i < 2; i++) deck.push({ id: "card_" + cardInstanceCounter++, cardDefId: "RENT_RAILROAD_UTILITY", name: "Rent (Railroad/Utility)", type: "Rent", bankValue: 1, details: { colors: ["Railroad", "Utility"] } });

    if (deck.length !== 106) {
        console.error(`ERROR: Deck creation failed: Incorrect number of cards generated. Expected 106, got ${deck.length}`);
    }

    deck = shuffle(deck);

    const initialGameLog: string[] = ["Game Started!"];
    let currentDeckState = deck;
    let currentDiscardState: Card[] = [];

    // Update players' hands based on the actual players from the lobby
    for (const player of this.gameState.players) { // Iterate over existing players
        const drawResult = drawCards(5, currentDeckState, currentDiscardState, initialGameLog);
        player.hand.push(...drawResult.drawn);
        currentDeckState = drawResult.updatedDeck;
        currentDiscardState = drawResult.updatedDiscardPile;
    }

    this.gameState.deck = currentDeckState;
    this.gameState.discardPile = [];
    this.gameState.currentPlayerIndex = 0;
    this.gameState.gamePhase = "DRAW_PHASE";
    this.gameState.gameStatus = "IN_GAME"; // <-- NEW: Transition to IN_GAME
    this.gameState.playsRemaining = 0; // Will be set to 3 in startPlayerTurn
    this.gameState.gameLog = initialGameLog; // Reset or append to previous logs
    this.gameState.gameEnded = false;
    this.gameState.winnerId = null;

    return this.gameState;
}

    public startPlayerTurn(): GameState {
        if (this.gameState.gameEnded || this.gameState.gameStatus !== "IN_GAME") return this.gameState;
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        this.gameState.gameLog.push(`--- ${currentPlayer.name}'s Turn ---`);

        const numCardsToDraw = (currentPlayer.hand.length === 0) ? 5 : 2;
        const drawResult = drawCards(numCardsToDraw, this.gameState.deck, this.gameState.discardPile, this.gameState.gameLog);
        currentPlayer.hand.push(...drawResult.drawn);
        this.gameState.deck = drawResult.updatedDeck;
        this.gameState.discardPile = drawResult.updatedDiscardPile;

        this.gameState.gameLog.push(`${currentPlayer.name} drew ${drawResult.drawn.length} card(s).`);

        this.gameState.gamePhase = "MAIN_PLAY_PHASE";
        this.gameState.playsRemaining = 3;
        this.gameState.actionContext = {};

        return this.gameState;
    }

    public handlePlayerAction(playerId: string, actionType: string, actionDetails: any = {}): GameState {
        if (this.gameState.gameEnded) return this.gameState;
        // --- NEW: Handle Lobby Actions ---
        if (this.gameState.gameStatus === "LOBBY") {
            const player = findPlayerById(this.gameState, playerId);
            if (!player) {
                console.error(`ERROR: Player ${playerId} not found in lobby.`);
                return this.gameState;
            }

            switch (actionType) {
                case "JOIN_GAME":
                    if (player.name.startsWith("Player ")) { // Only allow if it's a default name
                        player.name = actionDetails.playerName;
                        this.gameState.gameLog.push(`${actionDetails.playerName} has joined the game.`);
                    } else {
                        console.warn(`${player.name} tried to join an already claimed slot.`);
                    }
                    break;
                case "SET_READY_STATUS":
                    player.isReady = actionDetails.isReady;
                    this.gameState.gameLog.push(`${player.name} is now ${player.isReady ? "ready" : "not ready"}.`);
                    break;
                case "START_GAME":
                    const allPlayersJoined = this.gameState.players.length === this.gameState.expectedPlayerCount;
                    const allPlayersReady = this.gameState.players.every(p => p.isReady && !p.name.startsWith("Player ")); // Ensure names are set too

                    if (allPlayersJoined && allPlayersReady) {
                        this.gameState.gameLog.push("All players ready! Starting game...");
                        this.prepareGameForStart(this.gameState.players.map(p => p.name)); // Pass actual player names for consistency
                        this.startPlayerTurn(); // Start the first player's turn immediately after setup
                    } else {
                        console.warn("Cannot start game: Not all players have joined or are ready.");
                        this.gameState.gameLog.push("Host attempted to start game, but not all players are ready or slots are empty.");
                    }
                    break;
                default:
                    console.error(`ERROR: Invalid action ${actionType} in LOBBY phase.`);
            }
            return this.gameState;
        }
        // --- End New Lobby Actions ---
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];

        // IMPORTANT: In multi-client, any client can send an action if it's THEIR turn OR
        // if they are prompted for a response (JSN, Payment).
        // `playerId` must match whose action is expected.
        const isCurrentPlayerTurn = (playerId === currentPlayer.id);
        const isRespondingToPrompt = (this.gameState.gamePhase === "AWAIT_JSN_RESPONSE" && actionType === "JUST_SAY_NO_RESPONSE") ||
                                     (this.gameState.gamePhase === "AWAIT_PAYMENT" && actionType === "PAY_DEBT");

        if (!isCurrentPlayerTurn && !isRespondingToPrompt) {
            console.error(`ERROR: Not ${findPlayerById(this.gameState, playerId)?.name}'s turn or expected response. Current player: ${currentPlayer.name}, Phase: ${this.gameState.gamePhase}`);
            return this.gameState;
        }

        switch (this.gameState.gamePhase) {
            case "MAIN_PLAY_PHASE":
                if (actionType === "PLAY_CARD") {
                    this.playCard(playerId, actionDetails.cardId, actionDetails.targetPlayerId, actionDetails.targetPropertyId, actionDetails.chosenColor, actionDetails.sourcePropertyId);
                } else if (actionType === "END_TURN") {
                    this.endPlayerTurn();
                } else if (actionType === "CANCEL_ACTION") { // Allow cancelling action from UI
                    this.gameState.gameLog.push(`${findPlayerById(this.gameState, playerId)?.name} cancelled the pending card play.`);
                    this.gameState.actionContext = {}; // Clear context
                    this.gameState.playsRemaining++; // Refund the play if it was deducted
                }
                else {
                    console.error(`ERROR: Invalid action ${actionType} in MAIN_PLAY_PHASE.`);
                }
                break;
            case "DISCARD_PHASE":
                if (actionType === "DISCARD_CARD") {
                    this.discardCard(playerId, actionDetails.cardId);
                } else {
                    console.error(`ERROR: Invalid action ${actionType} in DISCARD_PHASE.`);
                }
                break;
            case "AWAIT_TARGET":
                if (actionType === "SELECT_TARGET") {
                    this.processTargetSelection(playerId, actionDetails.targetPlayerId, actionDetails.targetPropertyId, actionDetails.chosenColor, actionDetails.targetCardId, actionDetails.sourcePropertyId);
                } else if (actionType === "CANCEL_ACTION") {
                    this.gameState.gameLog.push(`${findPlayerById(this.gameState, playerId)?.name} cancelled the pending action selection.`);
                    this.gameState.gamePhase = "MAIN_PLAY_PHASE";
                    this.gameState.actionContext = {};
                    this.gameState.playsRemaining++; // Refund the play because target was not selected
                } else {
                    console.error(`ERROR: Invalid action ${actionType} in AWAIT_TARGET.`);
                }
                break;
            case "AWAIT_PAYMENT":
                if (actionType === "PAY_DEBT") {
                    // Only the owing player can send PAY_DEBT
                    if (playerId === this.gameState.actionContext.owingPlayerId) {
                         this.processPayment(playerId, actionDetails.cardsToPayIds);
                    } else {
                        console.error(`ERROR: Player ${findPlayerById(this.gameState, playerId)?.name} is not the owing player.`);
                    }
                } else {
                    console.error(`ERROR: Invalid action ${actionType} in AWAIT_PAYMENT.`);
                }
                break;
            case "AWAIT_JSN_RESPONSE":
                if (actionType === "JUST_SAY_NO_RESPONSE") {
                    // Any player (except the source) can send JSN_RESPONSE
                    if (playerId !== this.gameState.actionContext.pendingAction?.sourcePlayerId) {
                        this.processJustSayNoResponse(playerId, actionDetails.responseType, actionDetails.justSayNoCardId);
                    } else {
                        console.error(`ERROR: Player ${findPlayerById(this.gameState, playerId)?.name} is the source player and cannot play JSN.`);
                    }
                } else {
                    console.error(`ERROR: Invalid action ${actionType} in AWAIT_JSN_RESPONSE.`);
                }
                break;
            case "GAME_OVER":
                this.gameState.gameLog.push("ERROR: Game is over. No more actions allowed.");
                break;
            default:
                console.error(`ERROR: Unhandled game phase: ${this.gameState.gamePhase} with action type: ${actionType}.`);
        }

        this.gameState = checkWinCondition(this.gameState);

        return this.gameState;
    }

    private playCard(playerId: string, cardId: string, targetPlayerId: string | null = null, targetPropertyId: string | null = null, chosenColor: string | null = null, sourcePropertyId: string | null = null): GameState {
        const player = findPlayerById(this.gameState, playerId);
        if (!player) {
            console.error(`ERROR: Player ${playerId} not found.`);
            return this.gameState;
        }

        const cardIndex = player.hand.findIndex((c: Card) => c.id === cardId);
        if (cardIndex === -1) {
            console.error(`ERROR: Card ${cardId} not found in ${player.name}'s hand.`);
            return this.gameState;
        }

        const card = player.hand[cardIndex];

        // NEGATE_ACTION (Just Say No!) and DRAW_TWO (Pass Go) do not count as a play.
        const isActionCard = card.type === "Action";
        const isNegateAction = isActionCard && (card.details as ActionCardDetails).actionType === "NEGATE_ACTION";
        const isDrawTwoAction = isActionCard && (card.details as ActionCardDetails).actionType === "DRAW_TWO";

        if (this.gameState.playsRemaining <= 0 && !isNegateAction && !isDrawTwoAction) {
            console.error(`ERROR: ${player.name} has no plays remaining.`);
            return this.gameState;
        }

        player.hand.splice(cardIndex, 1); // Card removed from hand immediately

        if (!isDrawTwoAction) { // Pass Go does not decrement plays
            this.gameState.playsRemaining--;
        }

        this.gameState.gameLog.push(`${player.name} played ${card.name}.`);

        switch (card.type) {
            case "Money":
                player.bank.push(card);
                this.gameState.discardPile.push(card); // Money cards go to bank, then discard pile
                this.gameState.gameLog.push(`${player.name} banked ${card.name}.`);
                break;
            case "Property":
                addCardToPlayerProperties(player, card);
                // Property cards do NOT go to discard pile immediately. They stay on the board.
                this.gameState.gameLog.push(`${player.name} played ${card.name} to their ${(card.details as PropertyCardDetails).color} properties.`);
                break;
            case "PropertyWildcard":
                const pwDetails = card.details as PropertyWildcardDetails;
                if (chosenColor && (pwDetails.colors.includes(chosenColor) || pwDetails.colors.includes("Any"))) {
                    card.assignedColor = chosenColor;
                    addCardToPlayerProperties(player, card);
                    // Property wildcards do NOT go to discard pile immediately. They stay on the board.
                    this.gameState.gameLog.push(`${player.name} played ${card.name} as ${chosenColor} property.`);
                } else {
                    console.error(`ERROR: Property Wildcard requires a valid color selection or invalid color provided.`);
                    player.hand.push(card); // Return card to hand
                    this.gameState.playsRemaining++; // Refund the play
                }
                break;
            case "Action":
                if (isNegateAction) { // Just Say No! is banked, not "played" as an action
                    player.bank.push(card);
                    this.gameState.discardPile.push(card);
                    this.gameState.gameLog.push(`${player.name} banked Just Say No!.`);
                } else {
                    this.handleActionCardPlay(playerId, card, targetPlayerId, targetPropertyId, chosenColor, sourcePropertyId);
                }
                break;
            case "Rent":
                this.handleRentCardPlay(playerId, card, targetPlayerId, chosenColor);
                break;
            default:
                console.error(`ERROR: Unhandled card type in playCard: ${(card as any).type}`);
                player.hand.push(card); // Return card to hand
                this.gameState.playsRemaining++; // Refund the play
                break;
        }

        // After card play, if plays are 0 and not awaiting target, check for discard phase or end turn
        if (this.gameState.playsRemaining <= 0 && this.gameState.gamePhase === "MAIN_PLAY_PHASE") {
            if (player.hand.length > 7) {
                this.gameState.gamePhase = "DISCARD_PHASE";
                this.gameState.gameLog.push(`${player.name}: Discard down to 7 cards.`);
            } else {
                this.endPlayerTurn();
            }
        }

        return this.gameState;
    }

    private handleActionCardPlay(playerId: string, card: Card, targetPlayerId: string | null = null, targetPropertyId: string | null = null, chosenColor: string | null = null, sourcePropertyId: string | null = null): GameState {
        const player = findPlayerById(this.gameState, playerId);
        if (!player || card.type !== "Action") return this.gameState;

        const actionDetails = card.details as ActionCardDetails;

        // Certain actions are immediately discarded, others are stored in context until fully resolved.
        // For actions like House/Hotel or Forced Deal's first step, the card is in discard pile as part of playCard.
        // For actions like Debt Collector, Sly Deal, Deal Breaker, the card is also put in discard.
        this.gameState.discardPile.push(card);

        switch (actionDetails.actionType) {
            case "STEAL_SET": // Deal Breaker
            case "STEAL_PROPERTY": // Sly Deal
            case "COLLECT_FROM_PLAYER": // Debt Collector
                this.gameState.gamePhase = "AWAIT_TARGET";
                // FIX START: Pass name to actionDef
                this.gameState.actionContext = {
                    type: "ACTION_RESOLUTION",
                    cardId: card.id,
                    actionDef: { actionType: actionDetails.actionType, name: card.name }, // Provide name for UI
                    sourcePlayerId: playerId,
                    requiredTarget: actionDetails.actionType,
                    promptMessage: `Select target for ${card.name}.`,
                    sourcePropertyId: null // Not relevant for these actions
                };
                // FIX END
                this.gameState.gameLog.push(`${player.name} played ${card.name}. Awaiting target selection.`);
                return this.gameState;

            case "SWAP_PROPERTY": // Forced Deal - This is step 1, player selects OWN property
                if (!sourcePropertyId) {
                    console.error("ERROR: Forced Deal requires a source property ID.");
                    player.hand.push(card); // Return card to hand
                    this.gameState.playsRemaining++; // Refund the play
                    return this.gameState;
                }
                // FIX START: Pass name to actionDef
                this.gameState.gamePhase = "AWAIT_TARGET"; // Now await target opponent
                this.gameState.actionContext = {
                    type: "ACTION_RESOLUTION",
                    cardId: card.id,
                    actionDef: { actionType: actionDetails.actionType, name: card.name }, // Provide name for UI
                    sourcePlayerId: playerId,
                    requiredTarget: actionDetails.actionType, // This is "SWAP_PROPERTY"
                    promptMessage: `Select target opponent for ${card.name}.`,
                    sourcePropertyId: sourcePropertyId // Store the player's chosen property
                };
                // FIX END
                this.gameState.gameLog.push(`${player.name} played ${card.name}, selecting their own property. Now awaiting target opponent's property.`);
                return this.gameState;

            case "ADD_HOUSE":
            case "ADD_HOTEL":
                // These actions should have chosenColor passed during playCard (from handleComplexCardPlay)
                if (!chosenColor) {
                    console.error(`ERROR: ${actionDetails.actionType} requires a chosen color.`);
                    player.hand.push(card); // Return card to hand
                    this.gameState.playsRemaining++; // Refund the play
                    return this.gameState;
                }
                // Unlike other target actions, House/Hotel are resolved immediately here (no JSN for placement)
                if (isSetComplete(player, chosenColor)) {
                    const currentHousesHotels = player.housesAndHotels[chosenColor] || 0;
                    if (actionDetails.actionType === "ADD_HOUSE") {
                        if (currentHousesHotels === 0) {
                            player.housesAndHotels[chosenColor] = 1;
                            this.gameState.gameLog.push(`${player.name} added a House to their ${chosenColor} set.`);
                        } else {
                            this.gameState.gameLog.push(`Cannot add House to ${chosenColor} set (already has one or a hotel).`);
                            player.hand.push(card); // Return card to hand
                            this.gameState.playsRemaining++; // Refund the play
                        }
                    } else if (actionDetails.actionType === "ADD_HOTEL") {
                        if (currentHousesHotels === 1) {
                            player.housesAndHotels[chosenColor] = 2;
                            this.gameState.gameLog.push(`${player.name} added a Hotel to their ${chosenColor} set.`);
                        } else {
                            this.gameState.gameLog.push(`Cannot add Hotel to ${chosenColor} set (no house yet).`);
                            player.hand.push(card); // Return card to hand
                            this.gameState.playsRemaining++; // Refund the play
                        }
                    }
                } else {
                    this.gameState.gameLog.push(`Cannot add ${actionDetails.actionType} to an incomplete ${chosenColor} set.`);
                    player.hand.push(card); // Return card to hand
                    this.gameState.playsRemaining++; // Refund the play
                }
                this.gameState.gamePhase = "MAIN_PLAY_PHASE"; // Return to main play phase
                break;

            case "COLLECT_FROM_ALL": // It's My Birthday - AUTOMATIC PAYMENT FOR HOT-SEAT/MULTI-TAB
                this.gameState.gameLog.push(`${player.name} played It's My Birthday. Collecting 2M from all opponents.`);
                
                for (const otherPlayer of this.gameState.players) {
                    if (otherPlayer.id !== playerId) {
                        const amountToCollect = 2; // As per Birthday card rules

                        const totalAvailableAssets = calculatePlayerBankValue(otherPlayer) + calculatePlayerPropertyValue(otherPlayer);
                        const actualAmountPaid = Math.min(amountToCollect, totalAvailableAssets);

                        if (actualAmountPaid > 0) {
                            const cardsPaid: Card[] = []; 
                            let remainingToPay = actualAmountPaid;

                            // 1. Prioritize Money cards from bank
                            const moneyCardsToPay = otherPlayer.bank.filter(c => remainingToPay > 0 && c.bankValue <= remainingToPay).sort((a,b) => b.bankValue - a.bankValue); // Largest first for greedy payment
                            for (const card of moneyCardsToPay) {
                                if (remainingToPay >= card.bankValue) {
                                    cardsPaid.push(card);
                                    remainingToPay -= card.bankValue;
                                }
                            }
                            // Remove paid money cards from bank
                            otherPlayer.bank = otherPlayer.bank.filter(card => !cardsPaid.includes(card));

                            // 2. If still owing, use properties (excluding complete sets), smallest first
                            if (remainingToPay > 0) {
                                const propertiesEligibleToPay: Card[] = [];
                                for (const color in otherPlayer.properties) {
                                    if (!isSetComplete(otherPlayer, color)) { // Cannot pay with cards from complete sets
                                        propertiesEligibleToPay.push(...otherPlayer.properties[color]);
                                    }
                                }
                                // Sort properties by bankValue (smallest first) to prioritize paying with cheapest cards
                                propertiesEligibleToPay.sort((a, b) => a.bankValue - b.bankValue);

                                for (const card of propertiesEligibleToPay) {
                                    if (remainingToPay > 0) {
                                        if (removeCardFromPlayersAssets(otherPlayer, card.id)) { // This also handles removing from otherPlayer.properties
                                            cardsPaid.push(card);
                                            remainingToPay -= card.bankValue;
                                        }
                                    } else {
                                        break;
                                    }
                                }
                            }
                            
                            // Transfer collected cards to current player's bank
                            for(const card of cardsPaid) {
                                player.bank.push(card);
                            }
                            this.gameState.gameLog.push(`${otherPlayer.name} automatically paid ${player.name} ${actualAmountPaid}M for It's My Birthday.`);
                        } else {
                            this.gameState.gameLog.push(`${otherPlayer.name} owes ${amountToCollect}M to ${player.name} but has no assets to pay.`);
                        }
                    }
                }
                // After all payments, return to normal phase.
                this.gameState.gamePhase = "MAIN_PLAY_PHASE";
                break; 

            case "DRAW_TWO":
                this.gameState.gameLog.push(`${player.name} played Pass Go. Drawing 2 extra cards.`);
                const drawResult = drawCards(2, this.gameState.deck, this.gameState.discardPile, this.gameState.gameLog);
                player.hand.push(...drawResult.drawn);
                this.gameState.deck = drawResult.updatedDeck;
                this.gameState.discardPile = drawResult.updatedDiscardPile;
                break;

            case "DOUBLE_RENT":
                this.gameState.actionContext.doubleRentActive = true;
                this.gameState.actionContext.doubleRentSourceCardId = card.id;
                this.gameState.gameLog.push(`${player.name} played Double The Rent. Next rent will be doubled.`);
                break;

            case "NEGATE_ACTION": // Should be handled by playCard before calling handleActionCardPlay
                break;

            default:
                console.error(`ERROR: Unhandled action card type: ${actionDetails.actionType}`);
        }
        return this.gameState;
    }

    private handleRentCardPlay(playerId: string, rentCard: Card, targetPlayerId: string | null, chosenColor: string | null): GameState {
        const player = findPlayerById(this.gameState, playerId);
        const rentDetails = rentCard.details as RentCardDetails;
        if (!player || rentCard.type !== "Rent") return this.gameState;

        this.gameState.discardPile.push(rentCard);

        let effectiveColor = chosenColor;
        if (rentDetails.colors.includes("Any")) {
            if (!effectiveColor) {
                console.error("ERROR: Rainbow Rent requires a chosen color.");
                player.hand.push(rentCard);
                this.gameState.playsRemaining++;
                return this.gameState;
            }
        } else if (effectiveColor && !rentDetails.colors.includes(effectiveColor)) {
            console.error(`ERROR: Chosen color ${effectiveColor} not valid for this rent card.`);
            player.hand.push(rentCard);
            this.gameState.playsRemaining++;
            return this.gameState;
        } else if (!effectiveColor) { // If not "Any" rent, and no color chosen, default to the first color
            effectiveColor = rentDetails.colors[0];
        }


        const owedPlayer = findPlayerById(this.gameState, targetPlayerId || "");
        if (!owedPlayer) {
            console.error("ERROR: Rent card requires a valid target player.");
            player.hand.push(rentCard);
            this.gameState.playsRemaining++;
            return this.gameState;
        }

        const propertySet = player.properties[effectiveColor];
        if (!propertySet || propertySet.length === 0) {
            this.gameState.gameLog.push(`${player.name} tried to collect rent on ${effectiveColor} but has no properties of that color.`);
            return this.gameState;
        }

        const numProperties = propertySet.length;
        let rentAmount = 0;

        // Calculate rent based on first property in the set. All properties in a set have the same rent structure.
        if (player.properties[effectiveColor] && player.properties[effectiveColor].length > 0) {
            const propCard = player.properties[effectiveColor][0]; // Take any card from the set to get details
            if (propCard.type === "Property") {
                const propDetails = propCard.details as PropertyCardDetails;
                // Rent is based on the number of properties in the set minus 1 (0-indexed array)
                rentAmount = propDetails.rent[numProperties - 1] || 0;
            } else if (propCard.type === "PropertyWildcard" && propCard.assignedColor) {
                // For wildcards, derive rent from a representative property of the assigned color
                const representativeDef = Object.values(CARD_DEFINITIONS).find((def: any) =>
                    def.type === "Property" && def.color === propCard.assignedColor
                ) as PropertyCardDetails | undefined;

                if (representativeDef) {
                    rentAmount = representativeDef.rent[numProperties - 1] || 0;
                } else {
                    // Special cases for Railroads and Utilities which might not have exact Property defs matching wildcard names
                    if (propCard.assignedColor === "Railroad") {
                        rentAmount = [1, 2, 3, 4][numProperties - 1] || 0;
                    } else if (propCard.assignedColor === "Utility") {
                        rentAmount = [1, 2][numProperties - 1] || 0;
                    }
                }
            }
        }
        
        // Add house/hotel rent bonus
        if (player.housesAndHotels[effectiveColor] === 1) {
            rentAmount += 3; // House adds 3M
        } else if (player.housesAndHotels[effectiveColor] === 2) {
            rentAmount += 4; // Hotel adds 4M (total of 7M with house)
        }

        if (this.gameState.actionContext.doubleRentActive) {
            rentAmount *= 2;
            this.gameState.gameLog.push("Rent doubled by Double The Rent card.");
            this.gameState.actionContext.doubleRentActive = false;
            this.gameState.actionContext.doubleRentSourceCardId = undefined;
        }

        this.gameState.gameLog.push(`${player.name} demands ${rentAmount}M from ${owedPlayer.name} for their ${effectiveColor} set.`);
        this.requestPayment(owedPlayer.id, player.id, rentAmount);

        return this.gameState;
    }

    private processTargetSelection(currentPlayerId: string, targetPlayerId: string, targetPropertyId: string | null = null, chosenColor: string | null = null, targetCardId: string | null = null, sourcePropertyId: string | null = null): GameState {
        const context = this.gameState.actionContext;
        const sourcePlayer = findPlayerById(this.gameState, context.sourcePlayerId || "");
        const targetPlayer = findPlayerById(this.gameState, targetPlayerId);
        // The action card itself is now stored in context.actionDef for type-safety and access to name
        const actionCardName = context.actionDef?.name; 
        const actionDefType = context.actionDef?.actionType;

        if (!sourcePlayer || !targetPlayer || !actionCardName || !actionDefType) {
            console.error("ERROR: Invalid context for target selection.");
            this.gameState.gamePhase = "MAIN_PLAY_PHASE";
            this.gameState.actionContext = {};
            return this.gameState;
        }

        // Store details in pendingAction for JSN resolution
        this.gameState.actionContext.pendingAction = {
            type: actionDefType, // Use the action type from context.actionDef
            sourcePlayerId: sourcePlayer.id,
            targetPlayerId: targetPlayer.id,
            targetPropertyId: targetPropertyId,
            chosenColor: chosenColor,
            actionCard: { // Create a minimal card object for pendingAction, as full card is in discard
                id: context.cardId!,
                cardDefId: '', // Not needed for resolution logic here
                name: actionCardName,
                type: 'Action', // Assume Action for pendingAction context
                bankValue: 0,
                details: { actionType: actionDefType } as ActionCardDetails // Only actionType needed
            },
        };
        this.gameState.actionContext.sourcePropertyId = sourcePropertyId; // For Forced Deal

        this.gameState.actionContext.justSayNoStack = [];
        this.gameState.actionContext.jsnPendingPlayerIndex = 0;

        this.gameState.gameLog.push(`Action selected: ${actionCardName} by ${sourcePlayer.name} targeting ${targetPlayer.name}. Checking for Just Say No! responses.`);
        this.gameState.gamePhase = "AWAIT_JSN_RESPONSE";

        return this.gameState;
    }

    private processJustSayNoResponse(respondingPlayerId: string, responseType: "YES" | "NO", jsnCardId: string | null = null): GameState {
        const currentJsnContext = this.gameState.actionContext;
        if (!currentJsnContext.pendingAction || !currentJsnContext.justSayNoStack) {
            console.error("ERROR: No pending action in JSN context.");
            this.gameState.gamePhase = "MAIN_PLAY_PHASE";
            return this.gameState;
        }

        const respondingPlayer = findPlayerById(this.gameState, respondingPlayerId);
        if (!respondingPlayer) {
            console.error(`ERROR: Responding player ${respondingPlayerId} not found.`);
            return this.gameState;
        }

        if (responseType === "YES") {
            const jsnCardIndex = respondingPlayer.hand.findIndex((c: Card) => c.id === jsnCardId && c.type === "Action" && (c.details as ActionCardDetails).actionType === "NEGATE_ACTION");
            if (jsnCardIndex === -1) {
                console.error(`ERROR: Just Say No! card not found in hand for ${respondingPlayer.name} or invalid card.`);
                return this.gameState;
            }
            const jsnCard = respondingPlayer.hand.splice(jsnCardIndex, 1)[0];
            this.gameState.discardPile.push(jsnCard);

            currentJsnContext.justSayNoStack.push({ playerId: respondingPlayerId, cardId: jsnCard.id });
            this.gameState.gameLog.push(`${respondingPlayer.name} played Just Say No!`);

            // This should trigger the next player in the JSN cycle to be prompted.
            // In a multi-tab setup, the UI needs to manage who gets the prompt.
            // The engine simply updates the stack.
            this.gameState.gamePhase = "AWAIT_JSN_RESPONSE"; // Stay in JSN response phase
            return this.gameState; // Return to allow UI to re-evaluate for next player
        } else if (responseType === "NO") {
            this.gameState.gameLog.push(`${respondingPlayer.name} declined to play Just Say No!`);
        }
        
        // Simplified JSN resolution:
        // After any player responds (YES or NO), we iterate through all other players to see if they want to play a JSN.
        // For simplicity in a multi-tab context, if a player declines, the engine assumes it's their final answer
        // and the UI should then cycle to the next player until all have declined or a JSN is played.
        
        // To keep it simple for now, if 'NO' received, we assume that particular 'layer' of JSN stack is done with
        // and process the stack. This implies a JSN stack always resolves with the *first* 'NO'.
        
        // This is a simplification; a more complete JSN system for multi-player would require an explicit way
        // for the engine to 'ask' each player in turn for their JSN response.
        // For now, after any player explicitly declines, the stack resolves based on current depth.

        if (responseType === "NO") {
            if (currentJsnContext.justSayNoStack.length % 2 === 1) {
                this.gameState.gameLog.push(`The action (${currentJsnContext.pendingAction.actionCard.name}) is negated!`);
            } else {
                this.gameState.gameLog.push(`The action (${currentJsnContext.pendingAction.actionCard.name}) proceeds!`);
                this.resolveActionAfterJSN(currentJsnContext.pendingAction);
            }

            this.gameState.actionContext = {};
            this.gameState.gamePhase = "MAIN_PLAY_PHASE"; // Return to main phase of original player
        }
        // If responseType was "YES", we stay in AWAIT_JSN_RESPONSE and the UI should then re-prompt (or allow) other players to counter-JSN.

        return this.gameState;
    }

    private resolveActionAfterJSN(pendingAction: Exclude<ActionContext["pendingAction"], undefined>): GameState {
        const sourcePlayer = findPlayerById(this.gameState, pendingAction.sourcePlayerId);
        const targetPlayer = findPlayerById(this.gameState, pendingAction.targetPlayerId);
        if (!sourcePlayer || !targetPlayer) {
            console.error("ERROR: Source or target player not found for action resolution.");
            return this.gameState;
        }

        switch (pendingAction.type) {
            case "STEAL_SET":
                const stolenColor = pendingAction.chosenColor;
                if (stolenColor && targetPlayer.properties[stolenColor] && isSetComplete(targetPlayer, stolenColor)) {
                    const cardsToSteal = [...targetPlayer.properties[stolenColor]];
                    delete targetPlayer.properties[stolenColor];
                    for (const card of cardsToSteal) {
                        addCardToPlayerProperties(sourcePlayer, card);
                    }
                    this.gameState.gameLog.push(`${sourcePlayer.name} stole ${targetPlayer.name}'s complete ${stolenColor} set!`);
                } else {
                    this.gameState.gameLog.push("No valid complete set to steal or set not complete.");
                }
                break;

            case "STEAL_PROPERTY":
                const targetCardId = pendingAction.targetPropertyId;
                if (targetCardId) {
                    const targetCard = findCardInPlayersAssets(targetPlayer, targetCardId);
                    if (targetCard && (targetCard.type === "Property" || targetCard.type === "PropertyWildcard")) {
                        const cardColor = targetCard.type === "Property" ? (targetCard.details as PropertyCardDetails).color : targetCard.assignedColor;
                        if (cardColor && isSetComplete(targetPlayer, cardColor)) {
                            this.gameState.gameLog.push(`Cannot steal ${targetCard.name} from ${targetPlayer.name} as it's part of a complete set.`);
                            break;
                        }

                        if (removeCardFromPlayersAssets(targetPlayer, targetCard.id)) {
                            addCardToPlayerProperties(sourcePlayer, targetCard);
                            this.gameState.gameLog.push(`${sourcePlayer.name} stole ${targetCard.name} from ${targetPlayer.name}.`);
                        }
                    } else {
                        console.log(`Debug: targetCard is null or not property type. ${targetCard?.name} type ${targetCard?.type}`);
                        this.gameState.gameLog.push(`Cannot steal ${targetCard?.name || "property"} from ${targetPlayer.name} (not found, or not a property type).`);
                    }
                }
                break;

            case "SWAP_PROPERTY":
                const sourceCardId = this.gameState.actionContext.sourcePropertyId; 
                const targetPropId = pendingAction.targetPropertyId;

                if (sourceCardId && targetPropId) {
                    const sourceCard = findCardInPlayersAssets(sourcePlayer, sourceCardId);
                    const targetPropCard = findCardInPlayersAssets(targetPlayer, targetPropId);

                    if (sourceCard && targetPropCard &&
                        (sourceCard.type === "Property" || sourceCard.type === "PropertyWildcard") &&
                        (targetPropCard.type === "Property" || targetPropCard.type === "PropertyWildcard")) {

                        const sourceCardColor = sourceCard.type === "Property" ? (sourceCard.details as PropertyCardDetails).color : sourceCard.assignedColor;
                        if (sourceCardColor && isSetComplete(sourcePlayer, sourceCardColor)) {
                            this.gameState.gameLog.push(`Cannot swap ${sourceCard.name} from ${sourcePlayer.name} as it's part of a complete set.`);
                            break;
                        }

                        const targetCardColor = targetPropCard.type === "Property" ? (targetPropCard.details as PropertyCardDetails).color : targetPropCard.assignedColor;
                        if (targetCardColor && isSetComplete(targetPlayer, targetCardColor)) {
                            this.gameState.gameLog.push(`Cannot swap ${targetPropCard.name} from ${targetPlayer.name} as it's part of a complete set.`);
                            break;
                        }

                        if (removeCardFromPlayersAssets(sourcePlayer, sourceCard.id) && removeCardFromPlayersAssets(targetPlayer, targetPropCard.id)) {
                            addCardToPlayerProperties(sourcePlayer, targetPropCard);
                            addCardToPlayerProperties(targetPlayer, sourceCard);
                            this.gameState.gameLog.push(`${sourcePlayer.name} swapped ${sourceCard.name} with ${targetPropCard.name} from ${targetPlayer.name}.`);
                        }
                    } else {
                        this.gameState.gameLog.push("ERROR: Invalid properties for Forced Deal (not found, not properties, or from complete sets).");
                    }
                }
                break;

            case "COLLECT_FROM_PLAYER":
                this.requestPayment(targetPlayer.id, sourcePlayer.id, 5);
                break;

            case "ADD_HOUSE": // This should not be hit as House/Hotel are resolved in handleActionCardPlay
            case "ADD_HOTEL": // This should not be hit as House/Hotel are resolved in handleActionCardPlay
                console.error(`ERROR: House/Hotel actions should be resolved earlier. Pending action type: ${pendingAction.type}`);
                break;

            default:
                console.error(`ERROR: Unhandled action type in resolveActionAfterJSN: ${pendingAction.type}`);
        }
        return checkWinCondition(this.gameState);
    }

    private requestPayment(owingPlayerId: string, requestingPlayerId: string, amount: number): GameState {
        const owingPlayer = findPlayerById(this.gameState, owingPlayerId);
        if (!owingPlayer) {
            console.error(`ERROR: Owing player ${owingPlayerId} not found for payment.`);
            return this.gameState;
        }
        const requestingPlayer = findPlayerById(this.gameState, requestingPlayerId);
        if (!requestingPlayer) {
            console.error(`ERROR: Requesting player ${requestingPlayerId} not found for payment.`);
            return this.gameState;
        }

        const totalAvailableAssets = calculatePlayerBankValue(owingPlayer) + calculatePlayerPropertyValue(owingPlayer);
        const actualAmountOwed = Math.min(amount, totalAvailableAssets);

        owingPlayer.owedAmount = actualAmountOwed;
        owingPlayer.owedToPlayerId = requestingPlayerId;
        this.gameState.gamePhase = "AWAIT_PAYMENT";
        this.gameState.actionContext = {
            type: "PAYMENT_REQUEST",
            owingPlayerId: owingPlayerId,
            requestingPlayerId: requestingPlayerId,
            amount: actualAmountOwed,
            promptMessage: `${owingPlayer.name} owes ${requestingPlayer.name} ${actualAmountOwed}M. Select cards to pay.`
        };
        this.gameState.gameLog.push(`Payment request: ${owingPlayer.name} owes ${actualAmountOwed}M to ${requestingPlayer.name}.`);
        return this.gameState;
    }

    private processPayment(payingPlayerId: string, cardsToPayIds: string[]): GameState {
        const payingPlayer = findPlayerById(this.gameState, payingPlayerId);
        if (!payingPlayer) {
            console.error(`ERROR: Paying player ${payingPlayerId} not found.`);
            return this.gameState;
        }

        const context = this.gameState.actionContext;
        if (context.type !== "PAYMENT_REQUEST" || context.owingPlayerId !== payingPlayerId || !context.requestingPlayerId || context.amount === undefined) {
            console.error(`ERROR: Invalid payment context for ${payingPlayer.name}.`);
            return this.gameState;
        }

        const recipient = findPlayerById(this.gameState, context.requestingPlayerId);
        if (!recipient) {
            console.error(`ERROR: Recipient player ${context.requestingPlayerId} not found.`);
            return this.gameState;
        }

        let totalPaidValue = 0;
        const cardsToMove: Card[] = [];

        // Validate cards first, then add to cardsToMove
        for (const cardId of cardsToPayIds) {
            const card = findCardInPlayersAssets(payingPlayer, cardId);
            if (!card) {
                console.error(`ERROR: Card ${cardId} not found or not owned by ${payingPlayer.name}.`);
                // This shouldn't happen if UI passes valid IDs, but as a safeguard.
                // In a true invalid payment scenario, the UI should prevent sending it.
                continue; 
            }
            if (card.type === "Property" || card.type === "PropertyWildcard") {
                const cardColor = card.type === "Property" ? (card.details as PropertyCardDetails).color : card.assignedColor;
                if (cardColor && isSetComplete(payingPlayer, cardColor)) {
                    console.error(`ERROR: Cannot pay with a card from a complete set (${card.name}). This card was ignored.`);
                    // This error means the UI passed an invalid card. Engine tries to process valid ones.
                    continue;
                }
            }
            cardsToMove.push(card);
            totalPaidValue += card.bankValue;
        }

        // Check if sufficient payment was made after filtering out invalid cards
        if (totalPaidValue < context.amount) {
            // This case means the player attempted to pay but didn't meet the minimum.
            // The Monopoly Deal rules say if you can't pay the full amount, you pay what you can.
            // This implementation means if they send *any* cards, those are transferred.
            // If they sent nothing (cardsToPayIds empty), then totalPaidValue is 0.
            this.gameState.gameLog.push(`${payingPlayer.name} paid ${totalPaidValue}M out of ${context.amount}M owed to ${recipient.name}. They could not pay the full amount.`);
        } else {
             this.gameState.gameLog.push(`${payingPlayer.name} paid ${totalPaidValue}M to ${recipient.name}.`);
        }

        // Transfer cards
        for (const card of cardsToMove) {
            if (removeCardFromPlayersAssets(payingPlayer, card.id)) {
                recipient.bank.push(card); // Transfer to recipient's bank
            } else {
                console.error(`ERROR: Failed to remove card ${card.name} during payment. State might be inconsistent.`);
            }
        }

        // Reset payment state
        payingPlayer.owedAmount = 0;
        payingPlayer.owedToPlayerId = null;
        this.gameState.actionContext = {};

        // Return to main play phase, or whoever's turn it was.
        // If payment was triggered by a rent card, it should return to the demanding player's turn to continue plays.
        // If it was triggered by an action card (like Debt Collector), it should return to the original player's turn.
        this.gameState.gamePhase = "MAIN_PLAY_PHASE";

        return this.gameState;
    }


    private discardCard(playerId: string, cardId: string): GameState {
        const player = findPlayerById(this.gameState, playerId);
        if (!player) {
            console.error(`ERROR: Player ${playerId} not found for discard.`);
            return this.gameState;
        }

        const cardIndex = player.hand.findIndex((c: Card) => c.id === cardId);
        if (cardIndex === -1) {
            console.error(`ERROR: Card ${cardId} not found in ${player.name}'s hand to discard.`);
            return this.gameState;
        }

        const card = player.hand.splice(cardIndex, 1)[0];
        this.gameState.discardPile.push(card);

        this.gameState.gameLog.push(`${player.name} discarded ${card.name}.`);

        if (player.hand.length <= 7) {
            this.gameState.gameLog.push(`${player.name} finished discarding.`);
            this.endPlayerTurn();
        }

        return this.gameState;
    }

    public endPlayerTurn(): GameState {
        // Only allow ending turn if in IN_GAME status
        if (this.gameState.gameStatus !== "IN_GAME") return this.gameState;
        
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];

        if (currentPlayer.hand.length > 7) {
            this.gameState.gameLog.push(`ERROR: ${currentPlayer.name} must discard down to 7 cards before ending turn.`);
            this.gameState.gamePhase = "DISCARD_PHASE";
            return this.gameState;
        }

        this.gameState.gameLog.push(`${currentPlayer.name}'s turn ended.`);
        this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
        this.gameState.gamePhase = "DRAW_PHASE";
        this.gameState.playsRemaining = 0;
        this.gameState.actionContext = {}; // Clear any lingering action context

        return this.gameState;
    }
}


// Ensure Pass Go is counted as a play
export function playPassGoCard(player: Player, gameState: GameState) {
    drawCards(player, 2);
    gameState.actionsPlayedThisTurn += 1;
}

// Extend action card interaction to allow banking
export function handleActionCardClick(card: Card, player: Player, gameState: GameState) {
    if (card.moneyValue > 0) {
        showCardOptionsModal(card, [
            { label: "Play as Action", action: () => playAction(card, player, gameState) },
            { label: "Place in Bank", action: () => bankCard(player, card, gameState) }
        ]);
    } else {
        playAction(card, player, gameState);
    }
}
