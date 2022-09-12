# Control panel applet

This is an applet to help manage Earthstar keypairs, shares, and replica servers. It's written in React.

These configurations can then be used across different Earthstar apps on the same origin. Those apps can be made any way the author wants!

To test it, clone this repo and run the following:

```
yarn

yarn dev
```

- [x] Create new keypairs
- [x] Add existing keypairs
- [x] Inspect current keypair (copy address/secret)

- [x] Generate new shares
- [x] Add existing shares
- [x] Forget shares

- [x] Add replica servers
- [ ] Ping replica servers to see which shares are in common, or if it even is a replica server (needs new feature from Earthstar)

- [ ] Has any kind of styling whatsoever

- [ ] Redeem Earthstar [invitation codes](https://github.com/earthstar-project/earthstar/issues/36)
- [ ] Generate Earthstar invitation codes