const util = require('./util.js')
function Direction(startPos, finishPos){
    let startDelta = [finishPos[0]-startPos[0], finishPos[1]-startPos[1]]
    let startSize = Math.sqrt(startDelta[0]**2 + startDelta**2)
    this.getStep = size => {
        let k = size / startSize
        return [startDelta[0] * k, startDelta[1] * k]
    }
    this.inEdges = point => util.middle(startPos[0], point[0], finishPos[0]) == point[0] &&
                            util.middle(startPos[1], point[1], finishPos[1]) == point[1] &&
                            startDelta[0] / (point[0] - startPos[0]) == startDelta[1] / (point[1] - startPos[1])
    this.toString = () => startDelta
}
module.exports = Direction;