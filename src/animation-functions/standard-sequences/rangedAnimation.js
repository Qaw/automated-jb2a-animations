import { aaReturnWeapons } from "../../database/jb2a-menu-options.js";

const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

export async function range(handler, animationData) {

    const data = animationData.primary;
    const secondary = animationData.secondary;
    const sourceFX = animationData.sourceFX;
    const targetFX = animationData.targetFX;
    const macro = animationData.macro;
    const sourceToken = handler.sourceToken;
    const onlyX = data.enableCustom ? data.onlyX : false;
    const switchReturn = aaReturnWeapons.includes(data.video.animation) && !data.video.enableCustom ? data.options.isReturning : false;

    let returnDelay;
    switch (true) {
        case data.video.animation.includes('dagger'):
        case data.video.animation.includes('hammer'):
            returnDelay = 1000;
            break;
        default:
            returnDelay = 1500;
    }


    let aaSeq = await new Sequence("Automated Animations")

    // Play Macro if Awaiting
    if (macro && macro.playWhen === "1") {
        let userData = macro.args;
        aaSeq.macro(macro.name, handler.workflow, handler, userData)
    }
    // Extra Effects => Source Token if active
    if (sourceFX.enable) {
        aaSeq.addSequence(sourceFX.sourceSeq)
    }
    // Primary Sound
    if (data.sound) {
        aaSeq.addSequence(data.sound)
    }
    // Animation Start Hook
    aaSeq.thenDo(function () {
        Hooks.callAll("aa.animationStart", sourceToken, handler.allTargets)
    })
    // Primary Animation
    for (let i = 0; i < handler.allTargets.length; i++) {
        let currentTarget = handler.allTargets[i]
        let hit;

        if (handler.playOnMiss) {
            hit = handler.hitTargetsId.includes(currentTarget.id) ? true : false;
        } else {
            hit = true;
        }

        let nextSeq = aaSeq.effect()
        nextSeq.file(data.path.file)
        nextSeq.atLocation(sourceToken)
        nextSeq.stretchTo(currentTarget, { onlyX: onlyX })
        nextSeq.randomizeMirrorY()
        nextSeq.repeats(data.options.repeat, data.options.repeatDelay)
        nextSeq.opacity(data.options.opacity)
        nextSeq.missed(!hit)
        nextSeq.name("spot" + ` ${currentTarget.id}`)
        nextSeq.elevation(handler.elevation(sourceToken, data.options.isAbsolute, data.options.elevation))
        nextSeq.zIndex(data.options.zIndex)

        if (i === handler.allTargets.length - 1 && data.options.isWait) {
            nextSeq.waitUntilFinished(data.options.delay)
        } else if (!data.options.isWait) {
            nextSeq.delay(data.options.delay)
        }
        nextSeq.playbackRate(data.options.playbackRate)
    }

    // Return Animation if Enabled
    if (switchReturn) {
        for (let i = 0; i < handler.allTargets.length; i++) {
            let currentTarget = handler.allTargets[i]

            let returnSeq = aaSeq.effect()
            returnSeq.file(data.path.returnFile, true)
            returnSeq.opacity(data.options.opacity)
            returnSeq.atLocation(sourceToken)
            returnSeq.repeats(data.options.repeat, data.options.repeatDelay)
            returnSeq.stretchTo("spot" + ` ${currentTarget.id}`)
            returnSeq.zIndex(data.options.zIndex)
            returnSeq.playbackRate(data.options.playbackRate)
        }
    }

    // secondary animation and sound
    if (secondary) {
        if (secondary.sound) {
            aaSeq.addSequence(secondary.sound)
        }
        for (let i = 0; i < handler.allTargets.length; i++) {
            let currentTarget = handler.allTargets[i]
            let hit;
            if (handler.playOnMiss) {
                hit = handler.hitTargetsId.includes(currentTarget.id) ? true : false;
            } else {
                hit = true;
            }
            let secondarySeq = aaSeq.effect()
            secondarySeq.atLocation("spot" + ` ${currentTarget.id}`)
            secondarySeq.file(secondary.path?.file, true)
            secondarySeq.size(secondary.options.size * 2, { gridUnits: true })
            secondarySeq.repeats(secondary.options.repeat, secondary.options.repeatDelay)
            if (i === handler.allTargets.length - 1 && secondary.options.isWait && targetFX.enable) {
                secondarySeq.waitUntilFinished(secondary.options.delay)
            } else if (!secondary.options.isWait) {
                secondarySeq.delay(secondary.options.delay)
            }
            secondarySeq.elevation(handler.elevation(currentTarget, secondary.options.isAbsolute, secondary.options.elevation))
            secondarySeq.zIndex(secondary.options.zIndex)
            secondarySeq.opacity(secondary.options.opacity)
            secondarySeq.fadeIn(secondary.options.fadeIn)
            secondarySeq.fadeOut(secondary.options.fadeOut)
            if (secondary.options.rotateSource) {
                secondarySeq.rotateTowards(sourceToken)
                secondarySeq.rotate(180)    
            }
            if (secondary.options.isMasked) {
                secondarySeq.mask(currentTarget)
            }
            secondarySeq.anchor({x: secondary.options.anchor.x, y: secondary.options.anchor.y})
            secondarySeq.playbackRate(secondary.options.playbackRate)
        }
    }
    // Target animation and sound
    if (targetFX.enable) {
        if (targetFX.sound) {
            aaSeq.addSequence(targetFX.sound)
        }
        for (let currentTarget of handler.allTargets) {
            let hit;
            if (handler.playOnMiss) {
                hit = handler.hitTargetsId.includes(currentTarget.id) ? true : false;
            } else {
                hit = true;
            }
            if (hit) {
                let targetSequence = handler.buildTargetSeq(targetFX, currentTarget);
                aaSeq.addSequence(targetSequence.targetSeq)
            }
        }
    }
    // Macro if Concurrent
    if (macro && macro.playWhen === "0") {
        let userData = macro.args;
        new Sequence()
            .macro(macro.name, handler.workflow, handler, userData)
            .play()
    }
    aaSeq.play()
    await wait(handler.animEnd)
    // Animation End Hook
    Hooks.callAll("aa.animationEnd", sourceToken, handler.allTargets)
}