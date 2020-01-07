// Custom functions and helpers
// CMPT 767 Term Project, by Adam Badke, #301310785

// Helper function: Computes a single latLng midpoint for a block, given all of its latLng points
// Modifies resultsDict by inserting the computed value
function ComputeLatLngMidpoints(resultsDict)
{
    // Populate midpoint coordinates:
    for (var currentStreet in resultsDict)
    {
        for (var currentBlock in resultsDict[currentStreet].block)
        {
            var totalLatLngIndexes = 0;

            // Sum the number of latLngs:
            for (currentLatLng = 0; currentLatLng < resultsDict[currentStreet].block[currentBlock].latLngs.length; currentLatLng++)
            {
                totalLatLngIndexes += resultsDict[currentStreet].block[currentBlock].latLngs[currentLatLng].length;
            }

            // Find the middle index, or create an average:
            if (totalLatLngIndexes % 2 == 0)
            {
                var currentIndex = 0;
                var foundFirst 	= false;
                var foundSecond = false;
                var firstLatLng;
                var secondLatLng;
                var averageLatLng;
                for (outerLatLng = 0; outerLatLng < resultsDict[currentStreet].block[currentBlock].latLngs.length; outerLatLng++)
                {
                    for (innerLatLng = 0; innerLatLng < resultsDict[currentStreet].block[currentBlock].latLngs[outerLatLng].length; innerLatLng++)
                    {
                        if (currentIndex == (totalLatLngIndexes / 2) - 1)
                        {
                            firstLatLng = resultsDict[currentStreet].block[currentBlock].latLngs[outerLatLng][innerLatLng];
                            foundFirst 	= true;
                        }
                        else if (currentIndex == (totalLatLngIndexes / 2))
                        {
                            secondLatLng = resultsDict[currentStreet].block[currentBlock].latLngs[outerLatLng][innerLatLng];
                            foundSecond = true;
                        }
                        if (foundFirst && foundSecond)
                        {
                            break;
                        }
                        currentIndex++;
                    }

                    if (foundFirst && foundSecond)
                    {
                        break;
                    }
                }
                // Compute the average:
                resultsDict[currentStreet].block[currentBlock].midPoint = [(firstLatLng[0] + secondLatLng[0]) / 2, (firstLatLng[1] + secondLatLng[1]) / 2];
            }
            else
            {
                var currentIndex = 0;
                var midpointIndex = Math.floor(totalLatLngIndexes / 2) + 1;
                var foundMidpoint = false;
                for (outerLatLng = 0; outerLatLng < resultsDict[currentStreet].block[currentBlock].latLngs.length; outerLatLng++)
                {
                    for (innerLatLng = 0; innerLatLng < resultsDict[currentStreet].block[currentBlock].latLngs[outerLatLng].length; innerLatLng++)
                    {
                        if (currentIndex == midpointIndex)
                        {
                            resultsDict[currentStreet].block[currentBlock].midPoint = resultsDict[currentStreet].block[currentBlock].latLngs[outerLatLng][innerLatLng];
                            foundMidpoint = true;
                            break;
                        }
                        currentIndex++;
                    }
                    if (foundMidpoint)
                    {
                        break;
                    }
                }
            }
        }
    }
}