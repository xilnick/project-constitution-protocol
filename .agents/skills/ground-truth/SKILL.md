---
name: ground-truth
description: "Axiomatic verification and anti-laziness protocol: mandatory pre-mutation gate falsification, zero-stub completeness, clean-context adversarial review, and structured physical execution receipts."
---

# ground-truth

```asn
(:protocol :ground-truth
  :version "1.0.0"
  :postulates [
    (:falsify-first
      :pre-mutation-gate  (:must-fail true :record-sig true)
      :post-mutation-gate (:exit 0 :match-defect-fix true)
      :vacuous-rejection  (:when-baseline-pass :abort-plan))

    (:zero-slack
      :forbid   [:stub :todo :fixme :mock-return :empty-catch]
      :require  [:boundary-states (:null :empty :limits)
                 :failure-paths   (:timeout :disconnect :io-error)]
      :diff     (:optimum :shortest-working :yagni true))

    (:separation-of-duties
      :author-eval false
      :reviewer    (:context :clean :stance :adversarial)
      :audit-focus [:unhandled-boundaries :vacuous-asserts :weakened-gates])

    (:physical-receipt
      :verbal-claims false
      :schema (:receipt
                :cmd               Str
                :exit              0
                :asserts-evaluated (> 0)
                :stdout-tail       Str))
  ])
```
