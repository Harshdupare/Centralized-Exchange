"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, ArrowRight, Lock } from "lucide-react";

const Auth = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [showOtp, setShowOtp] = useState(false);

  const handleSendOtp = async () => {
    await fetch("/api/request-otp", {
      method: "POST",
      body: JSON.stringify({ phoneNumber: phoneNumber }),
      headers: { "Content-Type": "application/json" }
    });
    setShowOtp(true);
  }

  const handleChangeOtp = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }

    }
  }

  const handleOnKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  }

  const handleOtpVerifyingAndLogin = async () => {
    const res = await fetch("/api/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phoneNumber: phoneNumber, code: otp.join('') }),
      headers: { "Content-Type": "application/json" }
    })


    const json = await res.json();
    if (json.success) {
      signIn("credentials", { phoneNumber: phoneNumber, callbackUrl: "/" });
    } else {
      alert("OTP verification failed");
    }

  }


  return (
    <div className="">
      <div className="" />
      <div className="" />

      <motion.div>

        <div className="">
          <h2 className="">
            <span className="">Perpetuals</span>
            <span className="">Futures</span>
          </h2>
        </div>
        <p className="">Access your trading account</p>
      </motion.div>


      <AnimatePresence mode="wait">
        {showOtp ? (
          <motion.div>
            <div className="">
              <Phone className="" />
              <input
                className=""
                onChange={(e) => setPhoneNumber(e.target.value)}
              />

              <motion.button
                onClick={handleSendOtp}
              >
                <span>Send OTP</span>
                <ArrowRight className="" />
              </motion.button>
            </div>

            <motion.button>
              <span>Demo Button</span>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div>
            <div className="">
              <Lock className="" />
            </div>
            <p className="">Enter verification code sent to {phoneNumber}</p>

            <div className="">
              {otp.map((digit, index) => (
                <input
                  id={`otp-${index}`}
                  value={digit}
                  onChange={(e) => handleChangeOtp(index, e.target.value)}
                  onKeyDown={(e) => handleOnKeyDown(index, e)}
                />
              ))}
            </div>

            <motion.button
              onClick={handleOtpVerifyingAndLogin}
            >
              Verify OTP
            </motion.button>

            <button
              className=""
              onChange={() => setShowOtp(false)}
            >
              change Phone Number
            </button>
          </motion.div>
        )
        }
      </AnimatePresence>
    </div>
  );
}

export default Auth;
