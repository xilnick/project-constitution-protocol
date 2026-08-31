## Each item must be able to fail

Ask of every item: *what fails, right now, if this is done wrong?* No answer means the item is
misordered or its harness is missing — fix the plan rather than shipping the item with a note. And
a gate that works by comparing two implementations is blind to a defect they share, so such an item
needs a declared expected result for the cases that matter.
