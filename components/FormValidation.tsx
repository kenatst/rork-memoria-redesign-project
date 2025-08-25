import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { AlertCircle, Eye, EyeOff, Check } from 'lucide-react-native';
import Colors from '@/constants/colors';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface FormField {
  name: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  rules?: ValidationRule;
  multiline?: boolean;
  maxLength?: number;
}

interface ValidatedInputProps {
  field: FormField;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  touched?: boolean;
  onBlur?: () => void;
  style?: any;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  field,
  value,
  onChangeText,
  error,
  touched,
  onBlur,
  style,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  const isPassword = field.type === 'password';
  const hasError = touched && error;
  const isValid = touched && !error && value.length > 0;

  const getKeyboardType = () => {
    switch (field.type) {
      case 'email':
        return 'email-address';
      case 'number':
        return 'numeric';
      default:
        return 'default';
    }
  };

  return (
    <View style={[styles.inputContainer, style]}>
      <Text style={styles.label}>{field.label}</Text>
      <View style={[
        styles.inputWrapper,
        focused && styles.inputWrapperFocused,
        hasError && styles.inputWrapperError,
        isValid && styles.inputWrapperValid,
      ]}>
        <TextInput
          style={[
            styles.input,
            isPassword && styles.inputWithIcon,
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          placeholder={field.placeholder}
          placeholderTextColor={Colors.palette.taupe}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={getKeyboardType()}
          autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
          autoCorrect={field.type !== 'email'}
          multiline={field.multiline}
          maxLength={field.maxLength}
          textContentType={field.type === 'password' ? 'password' : field.type === 'email' ? 'emailAddress' : undefined}
        />
        
        {isPassword && (
          <Pressable
            style={styles.passwordToggle}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color={Colors.palette.taupe} />
            ) : (
              <Eye size={20} color={Colors.palette.taupe} />
            )}
          </Pressable>
        )}
        
        {isValid && (
          <View style={styles.validIcon}>
            <Check size={16} color={Colors.palette.accentGold} />
          </View>
        )}
      </View>
      
      {hasError && (
        <View style={styles.errorContainer}>
          <AlertCircle size={14} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {field.maxLength && (
        <Text style={styles.characterCount}>
          {value.length}/{field.maxLength}
        </Text>
      )}
    </View>
  );
};

export const validateField = (value: string, rules?: ValidationRule): string | null => {
  if (!rules) return null;

  if (rules.required && (!value || value.trim().length === 0)) {
    return 'Ce champ est requis';
  }

  if (rules.minLength && value.length < rules.minLength) {
    return `Minimum ${rules.minLength} caractères requis`;
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    return `Maximum ${rules.maxLength} caractères autorisés`;
  }

  if (rules.pattern && !rules.pattern.test(value)) {
    return 'Format invalide';
  }

  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
};

export const useFormValidation = (fields: FormField[], initialValues: Record<string, string> = {}) => {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const setValue = useCallback((name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Validate on change if field was already touched
    if (touched[name]) {
      const field = fields.find(f => f.name === name);
      const error = validateField(value, field?.rules);
      setErrors(prev => ({ ...prev, [name]: error || '' }));
    }
  }, [fields, touched]);

  const setFieldTouched = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate on blur
    const field = fields.find(f => f.name === name);
    const value = values[name] || '';
    const error = validateField(value, field?.rules);
    setErrors(prev => ({ ...prev, [name]: error || '' }));
  }, [fields, values]);

  const validateAll = useCallback(() => {
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};
    
    fields.forEach(field => {
      const value = values[field.name] || '';
      const error = validateField(value, field.rules);
      newErrors[field.name] = error || '';
      newTouched[field.name] = true;
    });
    
    setErrors(newErrors);
    setTouched(newTouched);
    
    return Object.values(newErrors).every(error => !error);
  }, [fields, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const isValid = Object.values(errors).every(error => !error) && 
                  fields.every(field => touched[field.name]);

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateAll,
    reset,
    isValid,
  };
};

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  url: /^https?:\/\/.+/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s]+$/,
};

// Common validation rules
export const CommonRules = {
  required: { required: true },
  email: { 
    required: true, 
    pattern: ValidationPatterns.email,
    custom: (value: string) => {
      if (!ValidationPatterns.email.test(value)) {
        return 'Adresse email invalide';
      }
      return null;
    }
  },
  password: { 
    required: true, 
    minLength: 8,
    custom: (value: string) => {
      if (value.length < 8) {
        return 'Le mot de passe doit contenir au moins 8 caractères';
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        return 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre';
      }
      return null;
    }
  },
  name: { 
    required: true, 
    minLength: 2, 
    maxLength: 50,
    pattern: ValidationPatterns.noSpecialChars 
  },
  albumName: { 
    required: true, 
    minLength: 1, 
    maxLength: 100 
  },
  description: { 
    maxLength: 500 
  },
};

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    borderColor: Colors.palette.accentGold,
    backgroundColor: 'rgba(255,215,0,0.1)',
  },
  inputWrapperError: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255,107,107,0.1)',
  },
  inputWrapperValid: {
    borderColor: Colors.palette.accentGold,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  inputWithIcon: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  validIcon: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    flex: 1,
  },
  characterCount: {
    color: Colors.palette.taupe,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
});