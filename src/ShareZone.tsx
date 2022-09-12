import * as React from 'react'
import { useAddShare, usePeer } from "react-earthstar";
import * as Earthstar from 'earthstar'

export function ShareZone() {
  const peer = usePeer();

  const shares = peer.shares();
  
  const [choice, setChoice ] = React.useState<'not_made' | 'create' | 'add'>('not_made')
  

  return (
    <fieldset>
      <legend>Shares</legend>
     { choice === 'not_made' ? <ShareList shares={shares} setChoice={setChoice}/> : choice === 'create' ? <ShareCreatorForm setChoice={setChoice}/> : <ShareAddForm setChoice={setChoice}/> }
      
    </fieldset>
  );
}

function ShareList({shares, setChoice}: {shares: string[], setChoice: React.Dispatch<React.SetStateAction<"not_made" | "create" | "add">>}) {
  return <div>{shares.length === 0
  ? <div>You have no shares.</div>
  : shares.map((share) => {
    return <ShareItem address={share} />;
  })}
  <div>
    <button onClick={() => setChoice('add')}>Add existing share</button>  
    <button onClick={() => setChoice('create')}>Create new share</button>
  </div>
  </div>
}

function ShareItem({address}: {address: Earthstar.ShareAddress}) {
  const peer = usePeer()
  
  return <li>{address} <button onClick={() => {
    peer.removeReplicaByShare(address)
  }}>Forget</button></li>
}

function ShareAddForm({ setChoice}: {setChoice: React.Dispatch<React.SetStateAction<"not_made" | "create" | "add">>}) {
  const addShare = useAddShare()
  const [address, setAddress] = React.useState('')
  
  return <form onSubmit={async (e) => {
    e.preventDefault();
    
    // validate
    
    const parsed = Earthstar.parseShareAddress(address);
    
    if (Earthstar.isErr(parsed)) {
      alert("The share you provided was not valid!")
      return
    }
    
    // save it
    await addShare(address)
    
    setChoice('not_made')
  }}>
    <input value={address} onChange={e => {
      setAddress(e.target.value)
    }}></input>
    <button type="submit">Add</button>
    <button onClick={() => {
      setChoice('not_made')
    }}>Cancel</button>    
    </form>
}

function ShareCreatorForm({ setChoice}: {setChoice: React.Dispatch<React.SetStateAction<"not_made" | "create" | "add">>}) {
  
  const [name, setName] = React.useState('');
  
  const [shareSuffix, setShareSuffix] = React.useState(generateSuffix);
  
  const candidateShareAddress = `+${name}.${shareSuffix}`
  
  const isValidAddress = Earthstar.checkShareIsValid(candidateShareAddress)
  
  const addShare = useAddShare()
  
  return <form onSubmit={async (e) => {
    e.preventDefault();
    
    
    await addShare(candidateShareAddress)
    
    setChoice('not_made')
  }}>
    <div>
      <span>+</span>
    <input value={name} onChange={(e) => {
      e.preventDefault()
      setName(e.target.value)}}/>
    <span>.</span>
    <span>{shareSuffix}</span>
    <button type="button" onClick={(e) => {
      e.preventDefault();
      
      setShareSuffix(generateSuffix())
    }}>↻</button>
    </div>
    
    <button type="submit" disabled={Earthstar.isErr(isValidAddress)}>Add new share</button>
    { Earthstar.isErr(isValidAddress) && name.length > 0 ? <div>{isValidAddress.message}</div> : null}
    
    </form>
}

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "1234567890";

function randomFromString(str: string) {
  return str[Math.floor(Math.random() * str.length)];
}

function generateSuffix() {
  const firstLetter = randomFromString(LETTERS);
  const rest = Array.from(Array(11), () => randomFromString(LETTERS + NUMBERS))
    .join("");

  return `${firstLetter}${rest}`;
}
