import React from 'react'
import { Route,Routes } from 'react-router-dom'
import SignupForm from './components/Signup'
import SignInForm from './components/Signin'
import HeroSection from './components/HeroSection'
import Navbar from './components/Navbar'
import JoinCoursePage from './components/Cources'

const App = () => {
  return (
    <>
    <Navbar/>
      <Routes>
        <Route path='/' element={<HeroSection/>}/>
        <Route path="/signin" element={<SignInForm />} />
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/cources" element={<JoinCoursePage/>} />


      </Routes>
    </>
  )
}

export default App