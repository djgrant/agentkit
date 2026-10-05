# Reading the source material

A design document is written for people who already know the system. The video is for someone who does not, and the author of the document is no exception: they also want to understand the video at first viewing.

## Explain how the system works before you show it failing

An RFC goes straight to its Problem section. The viewer first needs to know what the system does when nothing goes wrong. 

A problem sentence could be, "the reconciler asks AWS to create the resource, then records it in state". Each later scene breaks or repairs that sentence.

## Turn each problem into a scenario with real objects

An RFC might say: "A crash lost the record of any provider call that had finished but was not yet saved." The video then needs the same failure as a sequence of events: AWS creates `orders-db` → the process crashes → state has no record → the next deploy creates a second `orders-db`. Remember to use the same example for the whole video.

Make the cost of the old way concrete too. "A crash meant a mess" says nothing. "You had to diff state against what really exists in AWS, and reconcile the difference" tells the viewer what the mess is.

## Check the claims and the visuals against the code

In an RFC that said steps have "stable keys scoped to the resource", I made up keys such as `database/create` for the animation, and the user saw at once that they were probably wrong. The real key was in fact `notation:deploy:orders-db:create:remote:attempt:0`. So, make sure the script is grounded against the code.

## Leave things out

Keep information that the viewer needs to follow the story. Leave details that do not fit the story – the purpose is to quickly help the user construct a mental model.

## Do not follow the document's order

Order the video by what the viewer must know first in order to, brick-by-brick, construct that mental model.
