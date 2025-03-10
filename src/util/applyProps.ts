import { IStringIndexable } from "../types"
import { camelize } from "./camelize"

const IGNORED_KEYS = ["id"]

export const applyProps = (object: IStringIndexable, props: IStringIndexable) => {
  for (const incoming in props) {
    const value = props[incoming]
    let [firstKey, ...rest] = incoming.split(/[\.:]/)

    const key = camelize(firstKey)

    /* Attempt to parse the value */
    let parsed = undefined
    try {
      parsed = JSON.parse(value)
    } catch (e) {}

    switch (true) {
      /* Skip ignored keys */
      case IGNORED_KEYS.includes(key):
        break

      /* Ignore all data- keys */
      case firstKey.startsWith("data-"):
        break

      /* Handle nested keys, ie. position-x */
      case key in object && rest.length > 0:
        applyProps(object[key], { [rest.join(".")]: value })
        break

      /*
      Handle boolean properties. We will check against the only values that we consider falsey here,
      taking into account that they might be coming from string-based HTML element attributes, where a
      stand-alone boolean attribute like "cast-shadow" will emit a value of "". Eh!
      */
      case typeof object[key] === "boolean":
        object[key] = ![undefined, null, false, "no", "false"].includes(value)
        break

      /* Handle properties that provide .set methods */
      case object[key]?.set !== undefined:
        switch (true) {
          /* If the value is an array, feed its destructured representation to the set method. */
          case Array.isArray(parsed):
            object[key].set(...parsed)
            break

          /* A bit of special handling for "scale" properties, where we'll also accept a single numerical value */
          case key === "scale" && typeof parsed === "number":
            object[key].setScalar(parsed)
            break

          /* If we have a parsed value, set it directly */
          case parsed:
            object[key].set(parsed)
            break

          /* Otherwise, set the original string value, but split by commas */
          default:
            const list = value.split(",").map((el: string) => parseFloat(el) || el)
            object[key].set(...list)
        }
        break

      default:
        if (key in object) object[key] = parsed || value
        else console.warn("Trying to assign unknown property:", key)
    }
  }
}
