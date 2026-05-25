import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../api/supabase';

export default function AuthScreen() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('form'); // form | otp
  const [error, setError] = useState('');

  // Signup handler
  const handleSignup = async () => {
    setError('');
    if (!email.endsWith('@college.edu')) {
      setError('Use your college email.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    // Supabase sign up with email/password
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone, role: 'student' },
        emailRedirectTo: '', // Add redirect if needed
      },
    });
    if (signUpError) setError(signUpError.message);
    else setStep('otp');
  };

  // Login handler
  const handleLogin = async () => {
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSignup ? 'Sign Up' : 'Login'}</Text>
      {step === 'form' && (
        <>
          {isSignup && (
            <>
              <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
              <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </>
          )}
          <TextInput style={styles.input} placeholder="College Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
          {isSignup && (
            <TextInput style={styles.input} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          )}
          {!isSignup && (
            <TouchableOpacity onPress={() => Alert.alert('Forgot Password', 'Forgot Password functionality coming soon!')}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={isSignup ? handleSignup : handleLogin}>
            <Text style={styles.buttonText}>{isSignup ? 'Sign Up' : 'Login'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSignup(!isSignup)}>
            <Text style={styles.switch}>{isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}</Text>
          </TouchableOpacity>
        </>
      )}
      {step === 'otp' && (
        <>
          <Text>Check your email for the verification link/OTP.</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24, fontFamily: 'Manrope_700Bold' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: 'Manrope_400Regular' },
  button: { backgroundColor: '#007AFF', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, fontFamily: 'Manrope_700Bold' },
  switch: { color: '#007AFF', marginTop: 16, textAlign: 'center', fontFamily: 'Manrope_400Regular' },
  forgotPassword: { color: '#007AFF', textAlign: 'right', marginBottom: 16, fontFamily: 'Manrope_400Regular' },
  error: { color: 'red', marginBottom: 8 },
});
