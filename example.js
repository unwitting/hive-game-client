const _ = require('lodash')
const { Move, Board } = require('hive-game-core')
const { Client } = require('./client')

class BotClient extends Client {

  randomPiece(pieces) { return pieces[_.random(0, pieces.length - 1)] }

  /**
   * You must implement a method with this signature, and return a hive notation move string.
   *
   * This implementation is really dumb - it gets every potential move and chooses one at
   * random which is either a piece placement, or one which directly moves adjacent to the
   * opponent's queen.
   *
   * We use hive-game-core to create local Board objects with the game state, so that we
   * can make use of the useful methods such as getValidPlacementLocations(). You're under
   * no obligation to use hive-game-core - it just provides some useful stuff for you to
   * get off the ground with minimal effort.
   */
  move(gameState) {
    const potentialMoves = this._getAllPossibleMoves(gameState)
    const board = new Board({ state: gameState.board })
    this.log(`I have **${potentialMoves.length}** moves available for turn ${gameState.turn}`)
    const queenAttackingOnly = _.reject(potentialMoves, moveString => {
      const move = new Move(moveString)
      if (!move.isMovement) { return false }
      if (!board.isAdjacentToPiece(move.movementTargetCoords, 'Q', !this.getMe(gameState).white)) { return true }
      if (board.isAdjacentToPiece(move.movementOriginCoords, 'Q', !this.getMe(gameState).white)) { return true }
      return false
    })
    this.log(`**${queenAttackingOnly.length}** of those are queen-attacking or placement moves`)
    const moveSet = queenAttackingOnly.length ? queenAttackingOnly : potentialMoves
    const move = moveSet[_.random(moveSet.length - 1)]
    return move
  }

  _getAllPossibleMoves(gameState) {
    const potentialMoves = []
    const myPieces = this.getMyPieces(gameState)
    const board = new Board({ state: gameState.board })

    if (myPieces.length) {
      const validPlacementLocations = board.getValidPlacementLocations(gameState.turn)
      if (validPlacementLocations.length) {
        for (const coords of validPlacementLocations) {
          for (const piece of _.uniqBy(myPieces)) {
            potentialMoves.push(`${piece}+${coords.join(',')}`)
          }
        }
      }
    }

    const playedPieces = board.piecesPlaced[this.white ? 'white': 'black']
    for (const {piece, coords3} of playedPieces) {
      for (const movementTarget of board.getValidMovementTargets(coords3, gameState.turn)) {
        potentialMoves.push(`${piece}[${coords3.join(',')}]>${movementTarget.join(',')}`)
      }
    }

    return potentialMoves
  }

}

async function test() {
  const botA = new BotClient()
  const botB = new BotClient()
  while (true) {
    try {
      if (botA._games.length < 5) { await botA.joinFreeGame() }
      if (botB._games.length < 5) { await botB.joinFreeGame() }
      await botA.processOneMove()
      await botB.processOneMove()
    } catch(e) { console.error(e) }
  }
}

test()
