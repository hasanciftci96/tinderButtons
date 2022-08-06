import React, { useState, useMemo } from "react";

const getInitialIndexes = (keys, numberOfItems) => {
    const indexes = {};
    keys.forEach((key, index) => {
        let value = index === 0 ? 0 : -1
        if (numberOfItems[key] > 1) {
            indexes[key] = []
            for (let i = 0; i < numberOfItems[key]; i++) {
                indexes[key].push(i === 0 ? 0 : -1)
            }
        } else {
            indexes[key] = value
        }
    });
    return indexes;
};

const TinderAdMakerComponent = ({
    renderHeader,
    renderFooter,
    renderButtons = defaultRenderButtons,
    renderItems,
    limits: propLimits,
    data: propData,
    numberOfItems, // optional, if not provided, it's assumed all items are single selection
    onFinished,
    order, // optional, if not set, order of the keys in data object is used
    displayOrder, // optional, if not set, order of the keys in renderItems is used
}) => {
    const keys = order || Object.keys(propData);
    const limits = useMemo(
        () => // if we have less data items, than the limit, we set the limit to the number of items
            keys.reduce((obj, key) => {
                let maxDataLimit = propData[key].length
                if (numberOfItems && numberOfItems[key]) {
                    maxDataLimit = Math.floor(maxDataLimit / numberOfItems[key])
                }
                return { ...obj, [key]: Math.min(propLimits[key], maxDataLimit) }
            }, {}),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );
    const data = useMemo(() => order
        ? keys.reduce((obj, key) => ({ ...obj, [key]: propData[key] }), {})
        : propData,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );
    // we could calculate the history, instead of this state, but likely would be unnecessary complexity
    const [history, setHistory] = useState([]);

    const [finalAds, setFinalAds] = useState([]);
    const [finished, setFinished] = useState(false);
    const [finalRejections, setFinalRejections] = useState({});

    const [currentAd, setCurrentAd] = useState(getInitialIndexes(keys, numberOfItems));
    const [currentKey, setKey] = useState(keys[0]);

    const [currentSubItemIndex, setCurrentSubItemIndex] = useState(0); // only used in multi-selection 
    const [currentLimits, setCurrentLimits] = useState(limits);
    const currentKeyIndex = keys.indexOf(currentKey);

    const canGoBack = history.length > 0;
    const canGoUp = currentKeyIndex > 0;
    const canGoDown = currentKeyIndex < keys.length - 1;

    const addToApprovedOrRejected = (isItemApproved) => {
        const currentAds = [...finalAds];
        const currentRejections = { ...finalRejections };
        if (isItemApproved) {
            const approvedAd = {};
            for (const key in currentAd) {
                const index = currentAd[key];
                approvedAd[key] = data[key][index];
            }
            // if all fields of the ad are populated, then add it to the finalAds
            if (!Object.values(approvedAd).some((value) => !value)) {
                currentAds.push(approvedAd);
                setFinalAds(currentAds);
            }
            const rejectedItem = data[currentKey][currentAd[currentKey]];
            if (!currentRejections[currentKey]) currentRejections[currentKey] = [];
            // remove item from rejected items if it is there
            currentRejections[currentKey] = currentRejections[currentKey].filter(
                (item) => item !== rejectedItem
            );
        } else {
            const rejectedItem = data[currentKey][currentAd[currentKey]];
            if (!currentRejections[currentKey]) currentRejections[currentKey] = [];
            if (currentRejections[currentKey].indexOf(rejectedItem) === -1) {
                currentRejections[currentKey].push(rejectedItem);
            }
        }
        setFinalRejections(currentRejections);
        return [currentRejections, currentAds];
    };
    
    const addToHistory = () => {
        let addToHistory = true;
        let historyRepeats = 0
        for (let index = 0; index < data[currentKey].length; index++) {
            if (history[history.length - index - 1]?.key === currentKeyIndex) {
                historyRepeats++;
            }
        }
        addToHistory = historyRepeats < (data[currentKey].length);
        if (addToHistory) {
            setHistory([...history, clone({
                keyIndex: currentKeyIndex,
                limits: currentLimits,
                subItemIndex: currentSubItemIndex,
                ad: currentAd,
            })]);

        }
    }
    const isFinish = (rejectedItems, approvedAds)=>{
        let finish = false
        const isLastIndex = currentKeyIndex === keys.length - 1;

        if (
            isLastIndex &&
            Object.values(currentLimits).reduce((a, b) => a + b, 0) === 1
        ) {
            onFinished({ rejectedItems, approvedAds });
            setFinished(true);
            finish = true;
        }
        return finish
    }

    const calculateNextAd = ({finish, isSubKey, approved,nextSubItemIndex,nextKey}) => {
        let nextAd = { ...currentAd };
        const currentKeyNumberOfItems = numberOfItems && numberOfItems[currentKey]

        if (!finish) {
            if (isSubKey && (!approved || (currentSubItemIndex < currentKeyNumberOfItems - 1))) {
                const currentSubKeyIndex = nextAd[currentKey][nextSubItemIndex]
                // let nextSubKeyIndex = nextAd[currentKey][nextSubItemIndex]
                // avoid repeating items
                const selectedItemsIndexes = nextAd[currentKey].reduce((items, current, index) => {
                    if (index !== nextSubItemIndex && current >= 0) items.push(current)
                    return items;
                }, [])
                const possibleItemsIndexes = data[currentKey].reduce((items, current, index) => {
                    if (selectedItemsIndexes.indexOf(index) < 0) items.push(index)
                    return items;
                }, [])

                let firstIndexBefore
                let firstIndexAfter
                for (let i = 0; i < possibleItemsIndexes.length; i++) {
                    const index = possibleItemsIndexes[i]
                    if (firstIndexBefore === undefined && index < currentSubKeyIndex) {
                        firstIndexBefore = index
                    } else if (!firstIndexAfter && index > currentSubKeyIndex) {
                        firstIndexAfter = index
                        break
                    }
                }

                nextAd[currentKey][nextSubItemIndex] = firstIndexAfter ?? firstIndexBefore

            } else {
                if (numberOfItems && numberOfItems[nextKey]>1) {
                    nextAd[nextKey] = []
                    for (let i = 0; i < numberOfItems[nextKey]; i++) {
                        nextAd[nextKey].push(i === 0 ? 0 : -1)
                    }
                } else {
                    let newNextKeyIndex = currentAd[nextKey] + 1;
                    //  if we have less data items than the limit we set to the latest item
                    if (newNextKeyIndex > data[nextKey].length - 1) newNextKeyIndex = 0;
                    nextAd[nextKey] = newNextKeyIndex;
                }
            }

            setCurrentAd(nextAd);

        }
    }

    const approval = (approved) => {
        if (finished) return;
        const [rejectedItems, approvedAds] = addToApprovedOrRejected(approved);
        const length = keys.length;
        const isLastIndex = currentKeyIndex === length - 1;
        const currentItemLimit = currentLimits[currentKey];
        let nextKey = currentKey;

        addToHistory()

        let finish = isFinish(rejectedItems, approvedAds)

        let isSubKey = numberOfItems && numberOfItems[currentKey] > 1;
        const currentKeyNumberOfItems = numberOfItems && numberOfItems[currentKey]
        let navigatedNextSubKey = false;
        let nextSubItemIndex = currentSubItemIndex

        if (isSubKey && approved) {
            if (currentSubItemIndex < currentKeyNumberOfItems - 1) {
                navigatedNextSubKey = true;
                nextSubItemIndex = currentSubItemIndex + 1;
                setCurrentSubItemIndex(nextSubItemIndex);
            }
        }
        if (!navigatedNextSubKey) {
            if (isLastIndex) {
                if (currentItemLimit === 1) {
                    nextKey = keys[currentKeyIndex - 1];
                    // bellow, we calculate how back in the tree we go when we reach the end of the last item
                    if (currentLimits[nextKey] === 0) {
                        const countOfZeroKeys =
                            keys.filter((key) => currentLimits[key] === 0).length + 1;
                        nextKey = keys[currentKeyIndex - countOfZeroKeys]; // not 2 but the number of 0s in the tree
                    }
                    if (!finish) setKey(nextKey);
                }
            } else {
                if (approved) {
                    nextKey = keys[currentKeyIndex + 1];
                    if (!finish) setKey(nextKey);
                }
            }
            if (nextKey !== currentKey) {
                nextSubItemIndex = 0
                setCurrentSubItemIndex(0);
            }
        }
        calculateNextAd({finish, isSubKey, approved,nextSubItemIndex,nextKey})

        
        const nextKeyItemLimit = currentLimits[nextKey];
        const nextKeyIndex = keys.indexOf(nextKey);
        let nextLimits = { ...currentLimits };
        if (!isSubKey || nextSubItemIndex ===0) {
            if (nextKeyItemLimit === 0 && nextKeyIndex > currentKeyIndex) {
                nextLimits[nextKey] = limits[nextKey];
            }
            const nextCurrentLimit = nextLimits[currentKey] - 1;
            nextLimits[currentKey] = nextCurrentLimit < 0 ? 0 : nextCurrentLimit;
    
            setCurrentLimits(nextLimits);
        }

    };


    const goUp = () => {
        if (!canGoUp) return;
        const nextKeyIndex = currentKeyIndex - 1;
        const nextKey = keys[nextKeyIndex];
        setKey(nextKey);

    }
    const goDown = () => {
        if (!canGoDown) return;
        const nextKeyIndex = currentKeyIndex + 1;
        const nextKey = keys[nextKeyIndex];
        setKey(nextKey);

    }

    const goBack = () => {
        if (!canGoBack) return;
        if (isEqual(limits, currentLimits)) return;
        if (finished) setFinished(false);

        const nextKeyIndex = history[history.length - 1].keyIndex
        let nextKey = keys[nextKeyIndex];
        const nextLimits = history[history.length - 1].limits
        const nextAd = history[history.length - 1].ad;
        const nextSubItemIndex = history[history.length - 1].subItemIndex;

        // remove ad from final ads if it exists there
        const approvedAd = {};
        for (const key in currentAd) {
            const index = currentAd[key];
            approvedAd[key] = data[key][index];
        }
        // if all fields of the ad are populated, then we can try to remove it from the finalAds
        if (!Object.values(approvedAd).some((value) => !value)) { // if add is complete, else no point in checking
            setFinalAds(prevAds => prevAds.filter((ad) => isEqual(ad, approvedAd)));
        }
        // remove item from rejected items if it is there
        setFinalRejections((prev) => {
            prev[nextKey] = prev[nextKey].filter((rejectedItem) => isEqual(rejectedItem, data[nextKey][nextAd[nextKey]]))
            return prev
        })

        setKey(nextKey);
        setCurrentLimits(nextLimits);
        setCurrentAd(nextAd);
        setCurrentSubItemIndex(nextSubItemIndex);

        setHistory(prevHistory => prevHistory.slice(0, -1));
    };
    // calculate body
    const body = [];
    // fallback to renderItems key order for display order
    const orderKeys = displayOrder ?? Object.keys(renderItems);
    orderKeys.forEach((key) => {
        const isFocused = currentKey === key;
        if (numberOfItems[key] > 1) {
            const items = currentAd[key].map((index) => index >= 0 ? data[key][index] : null);
            // also send currently focused sub item index
            body.push(renderItems[key](items, isFocused, isFocused ? currentSubItemIndex : -1));
        } else {
            const currentItemIndex =
                currentAd[key] < 0 ? 0 : currentAd[key];
            const currentItem = data[key][currentItemIndex];
            body.push(renderItems[key](currentItem, isFocused));
        }
    });
    return (
        <>
            {renderHeader?.()}
            {body}
            {renderFooter?.()}
            {renderButtons({ approval, goBack, goUp, goDown, canGoBack, canGoUp, canGoDown, finished })}
        </>
    );
};

// we want to remove any UI from this component, but for testing purposes we can use this default render buttons
const defaultRenderButtons = ({ approval, goBack, finished, canGoBack, goUp, goDown, canGoUp, canGoDown }) => (
    <>
        <button disabled={finished} onClick={() => approval(true)}>
            Approve
        </button>
        <button disabled={finished} onClick={() => approval(false)}>
            Reject
        </button>
        <button disabled={!canGoBack} onClick={() => goBack()}>
            Go back
        </button>
        <button disabled={!canGoUp} onClick={() => goUp()}>
            up
        </button>
        <button disabled={!canGoDown} onClick={() => goDown()}>
            down
        </button>
    </>
)

export default TinderAdMakerComponent;

// Potentially replace this with an existing compare function, or  "lodash.isEqual"
// Works and is efficient when you have simple JSON-style objects without methods and DOM nodes inside
// meaning if using this, don't send DOM objects in your data
const isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = (a) => JSON.parse(JSON.stringify(a));

// usage example
// export const TinderComponentExample1 = () => (
//     <TinderAdMakerComponent
//         renderItems={{
//             headLine: (items, isFocused, currentSubItemIndex) => {
//                 return (
//                     <div>
//                         <>
//                         <h3 style={{ display: 'inline' }}> | </h3>
//                         {(items.map((item, index) => {
//                             const isSubItemFocused = index === currentSubItemIndex
//                             return (
//                                 <>
//                                 <h3 style={{ color: isSubItemFocused ? 'green' : 'white', display: 'inline' }} >{(item ?? '__') + ' '}</h3>
//                                 <h3 style={{ display: 'inline' }}> | </h3>
//                                 </>
//                             )
//                         }))}
//                         </>
//                     </div>)
//             },
//             description: (item, isFocused) => <p style={{ color: isFocused ? 'green' : 'white' }} >{item}</p>,
//             subDescription: (item, isFocused) => <p style={{ color: isFocused ? 'green' : 'white' }} >{item}</p>,
//         }}
//         limits={{
//             headLine: 3, // if limits are more that data length, it reduces to data length
//             // if ( number of data items/ number of items) less than limit, it reduces to that
//             description: 3,
//             subDescription: 3,
//         }}

//         numberOfItems={{
//             headLine: 2, // if numberOfItems are more that data length, it reduces to data length
//             description: 1,
//             subDescription: 1,
//         }}
//         // order={[ 'headLine', 'description', 'subDescription', 'sub2']} // optional, fallsback to data keys

//         // displayOrder={[ 'description','headLine', 'subDescription', 'sub2']} // optional, fallsback to renderItems keys

//         renderButtons={({ approval, goBack, finished, canGoBack, goUp, goDown, canGoUp, canGoDown }) => (
//             <>
//                 <button disabled={finished} onClick={() => approval(true)}>
//                     Approve
//                 </button>
//                 <button disabled={finished} onClick={() => approval(false)}>
//                     Reject
//                 </button>
//                 <button disabled={!canGoBack} onClick={() => goBack()}>
//                     Go back
//                 </button>
//                 <button disabled={!canGoUp} onClick={() => goUp()}>
//                     up
//                 </button>
//                 <button disabled={!canGoDown} onClick={() => goDown()}>
//                     down
//                 </button>
//             </>
//         )}
//         onFinished={({ rejectedItems, approvedAds }) => {
//             // we can navigate to next ad type here
//             console.info("approvedAds", approvedAds); // ex: [{ headLine: "h1", description: "t1", subDescription: "s3"},{ headLine: "h1", description: "t1", subDescription: "s2"}]
//             console.info("rejectedItems", rejectedItems); // ex: {headLine: ['h2'], subDescription: ['s3']'}
//         }}
//         data={{
//             headLine: ["h1", "h2", "h3", "h4"],
//             description: ["t1", "t2", "t3",],
//             subDescription: ["s1", "s2", "s3"],
//         }}
//     />
// );